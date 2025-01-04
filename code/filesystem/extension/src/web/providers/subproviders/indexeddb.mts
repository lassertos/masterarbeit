import path from "path";
import * as vscode from "vscode";
import { IndexedDBHandler } from "../indexeddbHandler.mjs";
import { CrossLabFileSystemSubProvider } from "./index.mjs";

export class IndexedDBFileSystemProvider
  implements CrossLabFileSystemSubProvider
{
  private _indexeddbHandler = new IndexedDBHandler();

  async initialize() {
    await this._indexeddbHandler.initialize();
  }

  exists(uri: vscode.Uri): boolean {
    return this._indexeddbHandler.exists(uri.path);
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    if (!this._indexeddbHandler.exists(uri.path)) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    return await this._indexeddbHandler.read(uri.path);
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    return this._indexeddbHandler.getDirectoryEntries(uri.path);
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    await this._indexeddbHandler.write(uri.path, {
      ctime: Date.now(),
      mtime: Date.now(),
      size: 0,
      type: vscode.FileType.Directory,
    });
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    return (
      (await this._indexeddbHandler.read(uri.path)).data ?? new Uint8Array()
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
    await this._indexeddbHandler.writeData(uri.path, content);
  }

  async delete(
    uri: vscode.Uri,
    options?: { readonly recursive: boolean }
  ): Promise<void> {
    if (!this._indexeddbHandler.exists(uri.path)) {
      throw vscode.FileSystemError.FileNotFound(
        "the following file was not found:" + uri.toString()
      );
    }

    await this._indexeddbHandler.delete(uri.path, options?.recursive);
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options?: { readonly overwrite: boolean }
  ): Promise<void> {
    const sourceExists = this._indexeddbHandler.exists(oldUri.path);
    const destinationParentExists = this._indexeddbHandler.exists(
      path.dirname(newUri.path)
    );
    const destinationExists = this._indexeddbHandler.exists(newUri.path);

    if (!sourceExists) {
      throw vscode.FileSystemError.FileNotFound(oldUri);
    }

    if (!destinationParentExists) {
      throw vscode.FileSystemError.FileNotFound(
        newUri.with({ path: path.dirname(newUri.path) })
      );
    }

    if (destinationExists && !options?.overwrite) {
      throw vscode.FileSystemError.FileExists(newUri.path);
    }

    if (newUri.path.startsWith(oldUri.path + "/")) {
      throw new Error(
        `Unable to move/copy when source '${oldUri.toString()}' is parent of target '${oldUri.toString()}'`
      );
    }

    if (oldUri.path === newUri.path) {
      return;
    }

    await this._indexeddbHandler.copy(oldUri.path, newUri.path);
    await this._indexeddbHandler.delete(oldUri.path);
  }

  async copy(
    source: vscode.Uri,
    destination: vscode.Uri,
    options?: { readonly overwrite: boolean }
  ): Promise<void> {
    const sourceExists = this._indexeddbHandler.exists(source.path);
    const destinationParentExists = this._indexeddbHandler.exists(
      path.dirname(destination.path)
    );
    const destinationExists = this._indexeddbHandler.exists(destination.path);

    if (!sourceExists) {
      throw vscode.FileSystemError.FileNotFound(source);
    }

    if (!destinationParentExists) {
      throw vscode.FileSystemError.FileNotFound(
        destination.with({ path: path.dirname(destination.path) })
      );
    }

    if (destinationExists && !options?.overwrite) {
      throw vscode.FileSystemError.FileExists(destination.path);
    }

    if (destination.path.startsWith(source.path + "/")) {
      throw new Error(
        `Unable to move/copy when source '${source.toString()}' is parent of target '${source.toString()}'`
      );
    }

    await this._indexeddbHandler.copy(source.path, destination.path);
  }
}
