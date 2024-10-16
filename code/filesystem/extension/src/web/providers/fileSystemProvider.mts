import path from "path";
import * as vscode from "vscode";
import { IndexedDBHandler } from "./indexeddbHandler.mjs";
import * as Diff from "diff";
import {
  openSettingsDatabase,
  readSetting,
  writeSetting,
} from "@crosslab-ide/editor-settings";

type CustomFileChangedEvent = vscode.FileChangeEvent & {
  changes?: {
    type: "insert" | "delete";
    start: number;
    value: string;
  }[];
};

export class CrossLabFileSystemProvider implements vscode.FileSystemProvider {
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  private indexeddbHandler = new IndexedDBHandler();
  private _currentProject: string | null = null;
  private _projectChangedHandlers: ((project: vscode.Uri) => void)[] = [];
  public copied: vscode.Uri[] = [];
  public isCutting: boolean = false;

  get currentProject(): string | null {
    return this._currentProject;
  }

  onDidChangeFile: vscode.Event<CustomFileChangedEvent[]> = this._emitter.event;

  watch(
    uri: vscode.Uri,
    options: {
      readonly recursive: boolean;
      readonly excludes: readonly string[];
    }
  ): vscode.Disposable {
    // ignore, fires for all changes...
    return new vscode.Disposable(() => {});
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    console.log("executing stat!", uri);
    const updatedUri = this.updateUri(uri);
    if (!this.indexeddbHandler.exists(updatedUri.path)) {
      throw vscode.FileSystemError.FileNotFound(updatedUri);
    }

    return await this.indexeddbHandler.read(updatedUri.path);
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    console.log("executing readDirectory!", uri);
    const updatedUri = this.updateUri(uri);
    return this.indexeddbHandler.getDirectoryEntries(updatedUri.path);
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    console.log("executing createDirectory!", uri);
    const updatedUri = this.updateUri(uri);
    await this.indexeddbHandler.write(updatedUri.path, {
      ctime: Date.now(),
      mtime: Date.now(),
      size: 0,
      type: vscode.FileType.Directory,
    });

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
    const updatedUri = this.updateUri(uri);
    return (
      (await this.indexeddbHandler.read(updatedUri.path)).data ??
      new Uint8Array()
    );
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
    const existed = this.indexeddbHandler.exists(updatedUri.path);
    const oldData = existed
      ? new TextDecoder().decode(
          (await this.indexeddbHandler.read(updatedUri.path)).data
        )
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

    await this.indexeddbHandler.writeData(updatedUri.path, content);

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
    if (!this.indexeddbHandler.exists(updatedUri.path)) {
      throw vscode.FileSystemError.FileNotFound(
        "the following file was not found:" + updatedUri.toString()
      );
    }

    await this.indexeddbHandler.delete(updatedUri.path, options?.recursive);

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

    if (updatedOldUri.path === updatedNewUri.path) {
      return;
    }

    await this.copy(updatedOldUri, updatedNewUri, options);
    await this.indexeddbHandler.delete(updatedOldUri.path);
  }

  async copy(
    source: vscode.Uri,
    destination: vscode.Uri,
    options?: { readonly overwrite: boolean }
  ): Promise<void> {
    console.log("executing copy!", source, destination, options);
    const updatedSource = this.updateUri(source);
    const updatedDestination = this.updateUri(destination);

    const existed = this.indexeddbHandler.exists(updatedDestination.path);

    const sourceExists = this.indexeddbHandler.exists(updatedSource.path);
    const destinationParentExists = this.indexeddbHandler.exists(
      path.dirname(updatedDestination.path)
    );
    const destinationExists = this.indexeddbHandler.exists(
      updatedDestination.path
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

    await this.indexeddbHandler.copy(
      updatedSource.path,
      updatedDestination.path
    );

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

  async getAllFiles() {
    return this.indexeddbHandler.getAllFiles();
  }

  getAllFilePaths() {
    return this.indexeddbHandler.getAllFilePaths();
  }

  getAllDirectoryPaths() {
    return this.indexeddbHandler.getAllDirectoryPaths();
  }

  addProjectChangedHandler(handler: (project: vscode.Uri) => void) {
    this._projectChangedHandlers.push(handler);
  }

  async setProject(project: string | null) {
    if (project !== this._currentProject) {
      for (const handler of this._projectChangedHandlers) {
        handler(
          vscode.Uri.from({
            scheme: "crosslabfs",
            path: project ? `/projects/${project}` : "/workspace",
          })
        );
      }
      this._currentProject = project;
      const settingsDatabase = await openSettingsDatabase();
      await writeSetting(
        settingsDatabase,
        "crosslab.current-project",
        project ? project : ""
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
      this._currentProject = (await readSetting(
        settingsDatabase,
        "crosslab.current-project"
      )) as string;
    } catch (error) {
      await writeSetting(settingsDatabase, "crosslab.current-project", "");
      this._currentProject = null;
    }
    await this.indexeddbHandler.initialize();
  }

  async clear() {
    await this.indexeddbHandler.clear();
  }

  updateUri(uri: vscode.Uri, path?: string) {
    const updatedUri = uri.with({
      path:
        (uri.path.startsWith("/workspace/") || uri.path === "/workspace") &&
        (this._currentProject || path)
          ? uri.path.replace(
              "/workspace",
              `/projects/${path ? path : this._currentProject}`
            )
          : uri.path,
    });

    return updatedUri;
  }
}
