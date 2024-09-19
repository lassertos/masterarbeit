import * as vscode from "vscode";
import { Directory } from "@crosslab-ide/compilation-messaging-protocol";

export async function parseDirectory(uri: vscode.Uri): Promise<Directory> {
  const directory: Directory = {
    type: "directory",
    name: uri.path.slice(uri.path.lastIndexOf("/")),
    content: [],
  };

  const entries = await vscode.workspace.fs.readDirectory(uri);
  for (const entry of entries) {
    const entryUri = uri.with({ path: `${uri.path}/${entry[0]}` });
    if (entry[1] === vscode.FileType.File) {
      directory.content.push({
        type: "file",
        name: entry[0],
        content: new TextDecoder().decode(
          await vscode.workspace.fs.readFile(entryUri)
        ),
      });
    } else if (entry[1] === vscode.FileType.Directory) {
      directory.content.push(await parseDirectory(entryUri));
    }
  }

  return directory;
}
