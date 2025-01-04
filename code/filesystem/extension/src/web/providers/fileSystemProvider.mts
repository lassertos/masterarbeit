import path from "path";
import * as vscode from "vscode";
import * as Diff from "diff";
import {
  openSettingsDatabase,
  readSetting,
  writeSetting,
} from "@crosslab-ide/editor-settings";
import { CrossLabFileSystemSubProvider } from "./subproviders/index.mjs";

type CustomFileChangedEvent = vscode.FileChangeEvent & {
  changes?: {
    type: "insert" | "delete";
    start: number;
    value: string;
  }[];
};

export class CrossLabFileSystemProvider implements vscode.FileSystemProvider {
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  private _currentProjectUri: vscode.Uri | null = null;
  private _projectChangedHandlers: ((project: vscode.Uri) => void)[] = [];
  private _mounts: Map<string, CrossLabFileSystemSubProvider> = new Map();
  private _baseProvider: CrossLabFileSystemSubProvider;
  public copied: vscode.Uri[] = [];
  public isCutting: boolean = false;

  constructor(baseProvider: CrossLabFileSystemSubProvider) {
    this._baseProvider = baseProvider;
  }

  get currentProjectUri(): vscode.Uri | null {
    return this._currentProjectUri;
  }

  addMount(path: string, provider: CrossLabFileSystemSubProvider) {
    if (this._mounts.has(path)) {
      throw new Error(`Path "${path}" already has a defined mount!`);
    }
    this._mounts.set(path, provider);
  }

  onDidChangeFile: vscode.Event<CustomFileChangedEvent[]> = this._emitter.event;

  watch(
    _uri: vscode.Uri,
    _options: {
      readonly recursive: boolean;
      readonly excludes: readonly string[];
    }
  ): vscode.Disposable {
    // ignore, fires for all changes...
    return new vscode.Disposable(() => {});
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    console.log("executing stat!", uri);
    const [provider, providerUri] = this._getProviderAndUri(uri);
    return await provider.stat(providerUri);
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    console.log("executing readDirectory!", uri);
    const [provider, providerUri] = this._getProviderAndUri(uri);
    return await provider.readDirectory(providerUri);
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    console.log("executing createDirectory!", uri);
    const updatedUri = this.updateUri(uri);
    const [provider, providerUri] = this._getProviderAndUri(uri);
    await provider.createDirectory(providerUri);

    this._fireSoon(
      {
        type: vscode.FileChangeType.Changed,
        uri: uri.with({ path: path.posix.dirname(updatedUri.path) }),
      },
      { type: vscode.FileChangeType.Created, uri: updatedUri }
    );
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    console.log("executing readFile!", uri);
    const [provider, providerUri] = this._getProviderAndUri(uri);
    return await provider.readFile(providerUri);
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options?: {
      readonly create: boolean;
      readonly overwrite: boolean;
      silent?: boolean;
    }
  ): Promise<void> {
    console.log("executing writeFile!", uri, content, options);
    const updatedUri = this.updateUri(uri);
    const [provider, providerUri] = this._getProviderAndUri(uri);
    const existed = provider.exists(providerUri);
    const oldData = existed
      ? new TextDecoder().decode(await provider.readFile(providerUri))
      : "";
    const newData = new TextDecoder().decode(content);
    const diffs = Diff.diffChars(oldData, newData);
    const changes: CustomFileChangedEvent["changes"] = [];

    let index = 0;
    for (const diff of diffs) {
      if (diff.added) {
        changes.push({
          type: "insert",
          start: index,
          value: diff.value,
        });
      } else if (diff.removed) {
        changes.push({
          type: "delete",
          start: index,
          value: diff.value,
        });
      }
      index += diff.value.length;
    }

    await provider.writeFile(providerUri, content, options);

    if (!existed) {
      this._fireSoon({ type: vscode.FileChangeType.Created, uri: updatedUri });
    } else if (oldData !== newData) {
      this._fireSoon({
        type: vscode.FileChangeType.Changed,
        uri: updatedUri,
        changes: options?.silent ? [] : changes,
      });
    }
  }

  async delete(
    uri: vscode.Uri,
    options?: { readonly recursive: boolean }
  ): Promise<void> {
    console.log("executing delete!", uri, options);
    const updatedUri = this.updateUri(uri);
    const [provider, providerUri] = this._getProviderAndUri(uri);
    if (!provider.exists(providerUri)) {
      throw vscode.FileSystemError.FileNotFound(
        "the following file was not found:" + updatedUri.toString()
      );
    }

    await provider.delete(providerUri, options);

    this._fireSoon(
      {
        type: vscode.FileChangeType.Changed,
        uri: updatedUri.with({ path: path.posix.dirname(updatedUri.path) }),
      },
      { uri: updatedUri, type: vscode.FileChangeType.Deleted }
    );
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options?: { readonly overwrite: boolean }
  ): Promise<void> {
    console.log("executing rename!", oldUri, newUri, options);
    const updatedOldUri = this.updateUri(oldUri);
    const updatedNewUri = this.updateUri(newUri);
    const [oldProvider, oldProviderUri] = this._getProviderAndUri(oldUri);
    const [newProvider, newProviderUri] = this._getProviderAndUri(newUri);

    const existed = newProvider.exists(newProviderUri);

    const sourceExists = oldProvider.exists(oldProviderUri);
    const destinationParentExists = newProvider.exists(
      newProviderUri.with({ path: path.dirname(newProviderUri.path) })
    );
    const destinationExists = newProvider.exists(newProviderUri);

    if (!sourceExists) {
      throw vscode.FileSystemError.FileNotFound(updatedOldUri);
    }

    if (!destinationParentExists) {
      throw vscode.FileSystemError.FileNotFound(
        updatedNewUri.with({ path: path.dirname(updatedNewUri.path) })
      );
    }

    if (destinationExists && !options?.overwrite) {
      throw vscode.FileSystemError.FileExists(updatedNewUri.path);
    }

    if (updatedNewUri.path.startsWith(updatedOldUri.path + "/")) {
      throw new Error(
        `Unable to move/copy when source '${updatedOldUri.toString()}' is parent of target '${updatedOldUri.toString()}'`
      );
    }

    if (updatedOldUri.path === updatedNewUri.path) {
      return;
    }

    if (oldProvider === newProvider) {
      await oldProvider.rename(oldProviderUri, newProviderUri);
    } else {
      await this._copy(updatedOldUri, updatedNewUri);
      await this.delete(updatedOldUri);
    }

    this._fireSoon(
      {
        type: vscode.FileChangeType.Changed,
        uri: updatedOldUri.with({
          path: path.posix.dirname(updatedOldUri.path),
        }),
      },
      { uri: updatedOldUri, type: vscode.FileChangeType.Deleted }
    );

    if (!existed) {
      this._fireSoon({
        type: vscode.FileChangeType.Created,
        uri: updatedNewUri,
      });
    } else {
      this._fireSoon({
        type: vscode.FileChangeType.Changed,
        uri: updatedNewUri,
      });
    }
  }

  async copy(
    source: vscode.Uri,
    destination: vscode.Uri,
    options?: { readonly overwrite: boolean }
  ): Promise<void> {
    console.log("executing copy!", source, destination, options);
    const updatedSource = this.updateUri(source);
    const updatedDestination = this.updateUri(destination);
    const [sourceProvider, sourceProviderUri] = this._getProviderAndUri(source);
    const [destinationProvider, destinationProviderUri] =
      this._getProviderAndUri(destination);

    const existed = destinationProvider.exists(destinationProviderUri);

    const sourceExists = sourceProvider.exists(sourceProviderUri);
    const destinationParentExists = destinationProvider.exists(
      destinationProviderUri.with({
        path: path.dirname(destinationProviderUri.path),
      })
    );
    const destinationExists = destinationProvider.exists(
      destinationProviderUri
    );

    if (!sourceExists) {
      throw vscode.FileSystemError.FileNotFound(updatedSource);
    }

    if (!destinationParentExists) {
      throw vscode.FileSystemError.FileNotFound(
        updatedDestination.with({ path: path.dirname(updatedDestination.path) })
      );
    }

    if (destinationExists && !options?.overwrite) {
      throw vscode.FileSystemError.FileExists(updatedDestination.path);
    }

    if (updatedDestination.path.startsWith(updatedSource.path + "/")) {
      throw new Error(
        `Unable to move/copy when source '${updatedSource.toString()}' is parent of target '${updatedSource.toString()}'`
      );
    }

    await this._copy(updatedSource, updatedDestination);

    if (!existed) {
      this._fireSoon({
        type: vscode.FileChangeType.Created,
        uri: updatedDestination,
      });
    } else {
      this._fireSoon({
        type: vscode.FileChangeType.Changed,
        uri: updatedDestination,
      });
    }
  }

  private async _copy(
    source: vscode.Uri,
    destination: vscode.Uri,
    type?: vscode.FileType
  ) {
    const [sourceProvider, sourceProviderUri] = this._getProviderAndUri(source);
    const [destinationProvider, destinationProviderUri] =
      this._getProviderAndUri(destination);

    if (sourceProvider === destinationProvider) {
      return await sourceProvider.copy(
        sourceProviderUri,
        destinationProviderUri
      );
    }

    const fileType =
      type ?? (await sourceProvider.stat(sourceProviderUri)).type;

    if (fileType === vscode.FileType.File) {
      return await this.writeFile(destination, await this.readFile(source));
    }

    if (fileType !== vscode.FileType.Directory) {
      throw new Error(`Unexpected file type "${fileType}"!`);
    }

    for (const [name, type] of await this.readDirectory(source)) {
      await this._copy(
        source.with({ path: path.join(source.path, name) }),
        destination.with({ path: path.join(destination.path, name) }),
        type
      );
    }
  }

  // event handling

  private _bufferedEvents: CustomFileChangedEvent[] = [];
  private _fireSoonHandle?: NodeJS.Timer;

  private _fireSoon(...events: CustomFileChangedEvent[]): void {
    this._bufferedEvents.push(...events);

    if (this._fireSoonHandle) {
      clearTimeout(this._fireSoonHandle as any);
    }

    this._fireSoonHandle = setTimeout(() => {
      this._emitter.fire(this._bufferedEvents);
      this._bufferedEvents.length = 0;
    }, 5);
  }

  // helper functions

  private async _getAllEntries(uri?: vscode.Uri) {
    const entries = [];
    for (const [mountPath, provider] of this._mounts.entries()) {
      entries.push(
        ...(
          await provider.readDirectory(
            uri ?? vscode.Uri.from({ scheme: "crosslabfs", path: "/" })
          )
        ).map(async ([name, type]) => {
          const entryPath = path.join(mountPath, name);
          return {
            type,
            path: entryPath,
            content:
              type === vscode.FileType.File
                ? await provider.readFile(
                    vscode.Uri.from({
                      scheme: "crosslabfs",
                      path: entryPath,
                    })
                  )
                : undefined,
          };
        })
      );
    }
    return Promise.all(entries);
  }

  async getAllFiles() {
    return (await this._getAllEntries()).filter(
      (entry) => entry.type === vscode.FileType.File
    );
  }

  async getAllFilePaths() {
    return (await this.getAllFiles()).map((entry) => entry.path);
  }

  async getAllDirectoryPaths() {
    return (await this._getAllEntries())
      .filter((entry) => entry.type === vscode.FileType.Directory)
      .map((entry) => entry.path);
  }

  addProjectChangedHandler(handler: (project: vscode.Uri) => void) {
    this._projectChangedHandlers.push(handler);
  }

  async setProject(projectUri: vscode.Uri | null) {
    if (projectUri !== this._currentProjectUri) {
      for (const handler of this._projectChangedHandlers) {
        handler(
          projectUri ??
            vscode.Uri.from({
              scheme: "crosslabfs",
              path: "/workspace",
            })
        );
      }
      this._currentProjectUri = projectUri;
      const settingsDatabase = await openSettingsDatabase();
      await writeSetting(
        settingsDatabase,
        "crosslab.current-project",
        projectUri ? projectUri.toString() : ""
      );
      await writeSetting(
        settingsDatabase,
        "crosslab.current-project-name",
        projectUri ? path.basename(projectUri.path) : ""
      );
      vscode.commands.executeCommand("workbench.action.closeAllEditors");
    }
    vscode.commands.executeCommand(
      "workbench.files.action.refreshFilesExplorer"
    );
  }

  async initialize() {
    const settingsDatabase = await openSettingsDatabase();
    try {
      const savedUri = vscode.Uri.parse(
        (await readSetting(
          settingsDatabase,
          "crosslab.current-project"
        )) as string
      );
      if ((await this.stat(savedUri)).type !== vscode.FileType.Directory) {
        throw new Error(`Saved project "${savedUri.path}" is not a directory!`);
      }
      this._currentProjectUri = savedUri;
    } catch (error) {
      await writeSetting(settingsDatabase, "crosslab.current-project", "");
      await writeSetting(settingsDatabase, "crosslab.current-project-name", "");
      this._currentProjectUri = null;
      vscode.commands.executeCommand("workbench.action.closeAllEditors");
    }
  }

  private _getProviderAndUri(
    uri: vscode.Uri
  ): [CrossLabFileSystemSubProvider, vscode.Uri] {
    const updatedUri = this.updateUri(uri);
    for (const [path, provider] of this._mounts.entries()) {
      if (updatedUri.path.startsWith(path + "/") || updatedUri.path === path) {
        return [
          provider,
          updatedUri.with({
            path: updatedUri.path.startsWith(path + "/")
              ? updatedUri.path.replace(path, "")
              : "/",
          }),
        ];
      }
    }
    return [this._baseProvider, uri];
  }

  updateUri(uri: vscode.Uri) {
    const updatedUri = uri.with({
      path:
        (uri.path.startsWith("/workspace/") || uri.path === "/workspace") &&
        this._currentProjectUri
          ? uri.path.replace("/workspace", this._currentProjectUri.path)
          : uri.path,
    });

    return updatedUri;
  }
}
