import * as vscode from "vscode";
import { CrossLabFileSystemSubProvider } from "./index.mjs";
import { FileSystemService__Consumer } from "@crosslab-ide/crosslab-filesystem-service";

export class FilesystemServiceFileSystemProvider
  implements CrossLabFileSystemSubProvider
{
  private _filesystemServiceConsumer: FileSystemService__Consumer;
  private _producerId: string;

  constructor(
    filesystemServiceConsumer: FileSystemService__Consumer,
    producerId: string
  ) {
    this._filesystemServiceConsumer = filesystemServiceConsumer;
    this._producerId = producerId;
  }

  async exists(uri: vscode.Uri): Promise<boolean> {
    return await this._filesystemServiceConsumer.exists(
      this._producerId,
      uri.path
    );
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const stat = await this._filesystemServiceConsumer.stat(
      this._producerId,
      uri.path
    );

    return {
      ...stat,
      type:
        stat.type === "file" ? vscode.FileType.File : vscode.FileType.Directory,
    };
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const directory = await this._filesystemServiceConsumer.readDirectory(
      this._producerId,
      uri.path
    );

    const result: [string, vscode.FileType][] = [];

    for (const entryName in directory.content) {
      result.push([
        entryName,
        directory.content[entryName].type === "file"
          ? vscode.FileType.File
          : vscode.FileType.Directory,
      ]);
    }

    return result;
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    await this._filesystemServiceConsumer.createDirectory(
      this._producerId,
      uri.path
    );
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const file = await this._filesystemServiceConsumer.readFile(
      this._producerId,
      uri.path
    );

    return file.content;
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    _options?: { readonly create: boolean; readonly overwrite: boolean }
  ): Promise<void> {
    await this._filesystemServiceConsumer.writeFile(
      this._producerId,
      uri.path,
      content
    );
  }

  async delete(
    uri: vscode.Uri,
    _options?: { readonly recursive: boolean }
  ): Promise<void> {
    await this._filesystemServiceConsumer.delete(this._producerId, uri.path);
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    _options?: { readonly overwrite: boolean }
  ): Promise<void> {
    await this._filesystemServiceConsumer.move(
      this._producerId,
      oldUri.path,
      newUri.path
    );
  }

  async copy(
    source: vscode.Uri,
    destination: vscode.Uri,
    _options?: { readonly overwrite: boolean }
  ): Promise<void> {
    await this._filesystemServiceConsumer.copy(
      this._producerId,
      source.path,
      destination.path
    );
  }
}
