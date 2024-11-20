import vscode from "vscode";

export abstract class CrossLabFileSystemSubProvider {
  abstract initialize?: () => Promise<void> | undefined;
  abstract exists(uri: vscode.Uri): boolean;
  abstract stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat>;
  abstract readDirectory(
    uri: vscode.Uri
  ): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]>;
  abstract createDirectory(uri: vscode.Uri): void | Thenable<void>;
  abstract readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array>;
  abstract writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options?: { readonly create: boolean; readonly overwrite: boolean }
  ): void | Thenable<void>;
  abstract delete(
    uri: vscode.Uri,
    options?: { readonly recursive: boolean }
  ): void | Thenable<void>;
  abstract rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options?: { readonly overwrite: boolean }
  ): void | Thenable<void>;
  abstract copy(
    source: vscode.Uri,
    destination: vscode.Uri,
    options?: { readonly overwrite: boolean }
  ): void | Thenable<void>;
}
