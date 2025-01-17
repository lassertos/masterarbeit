import { Directory, File } from "@crosslab-ide/filesystem-schemas";
import path from "path";
import * as vscode from "vscode";

export async function readEntry(uri: vscode.Uri): Promise<File | Directory> {
  const type = (await vscode.workspace.fs.stat(uri)).type;

  if (type !== vscode.FileType.Directory) {
    return await readFile(uri);
  }

  return await readDirectory(uri);
}

export async function readFile(uri: vscode.Uri): Promise<File> {
  return {
    type: "file",
    name: path.basename(uri.path),
    content: await vscode.workspace.fs.readFile(uri),
  };
}

export async function readDirectory(uri: vscode.Uri): Promise<Directory> {
  const directory: Directory = {
    type: "directory",
    name: path.basename(uri.path),
    content: {},
  };

  const entries = await vscode.workspace.fs.readDirectory(uri);
  for (const [name, _] of entries) {
    directory.content[name] = await readEntry(
      uri.with({ path: path.join(uri.path, name) })
    );
  }

  return directory;
}
