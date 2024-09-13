import path from "path";
import * as vscode from "vscode";
import { IndexedDBHandler } from "./indexeddbHandler";
import * as Diff from "../../node_modules/@types/diff";

type CustomFileChangedEvent = vscode.FileChangeEvent & {
  changes?: {
    type: "insert" | "delete";
    start: number;
    value: string;
  }[];
};

export class GOLDiFileSystemProvider implements vscode.FileSystemProvider {
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  private indexeddbHandler = new IndexedDBHandler();

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
    if (!this.indexeddbHandler.exists(uri.path)) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    return await this.indexeddbHandler.read(uri.path);
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    return this.indexeddbHandler.getDirectoryEntries(uri.path);
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    await this.indexeddbHandler.write(uri.path, {
      ctime: Date.now(),
      mtime: Date.now(),
      size: 0,
      type: vscode.FileType.Directory,
    });

    this._fireSoon(
      {
        type: vscode.FileChangeType.Changed,
        uri: uri.with({ path: path.posix.dirname(uri.path) }),
      },
      { type: vscode.FileChangeType.Created, uri }
    );
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    return (
      (await this.indexeddbHandler.read(uri.path)).data ?? new Uint8Array()
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
    const existed = this.indexeddbHandler.exists(uri.path);
    const oldData = existed
      ? new TextDecoder().decode(
          (await this.indexeddbHandler.read(uri.path)).data
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

    await this.indexeddbHandler.writeData(uri.path, content);

    if (!existed) {
      this._fireSoon({ type: vscode.FileChangeType.Created, uri });
    } else if (oldData !== newData) {
      this._fireSoon({
        type: vscode.FileChangeType.Changed,
        uri,
        changes: options?.silent ? [] : changes,
      });
    }
  }

  async delete(
    uri: vscode.Uri,
    options?: { readonly recursive: boolean }
  ): Promise<void> {
    if (!this.indexeddbHandler.exists(uri.path)) {
      throw vscode.FileSystemError.FileNotFound(
        "the following file was not found:" + uri.toString()
      );
    }

    await this.indexeddbHandler.delete(uri.path, options?.recursive);

    this._fireSoon(
      {
        type: vscode.FileChangeType.Changed,
        uri: uri.with({ path: path.posix.dirname(uri.path) }),
      },
      { uri, type: vscode.FileChangeType.Deleted }
    );
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options?: { readonly overwrite: boolean }
  ): Promise<void> {
    await this.indexeddbHandler.copy(oldUri.path, newUri.path);
    await this.indexeddbHandler.delete(oldUri.path);

    this._fireSoon(
      { type: vscode.FileChangeType.Deleted, uri: oldUri },
      { type: vscode.FileChangeType.Created, uri: newUri }
    );
  }

  async copy?(
    source: vscode.Uri,
    destination: vscode.Uri,
    options?: { readonly overwrite: boolean }
  ): Promise<void> {
    await this.indexeddbHandler.copy(source.path, destination.path);
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

  async initialize() {
    await this.indexeddbHandler.initialize();
  }

  async clear() {
    await this.indexeddbHandler.clear();
  }
}
