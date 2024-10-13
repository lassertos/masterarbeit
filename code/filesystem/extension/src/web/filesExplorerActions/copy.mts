import { CrossLabFileSystemProvider } from "../providers/fileSystemProvider.mjs";
import { getSelectedUris } from "./util.mjs";
import vscode from "vscode";

export function registerFilesExplorerCopy(
  context: vscode.ExtensionContext,
  fileSystemProvider: CrossLabFileSystemProvider
) {
  let filesExplorerCopyDisposable = vscode.commands.registerCommand(
    "filesExplorer.copy",
    filesExplorerCopy
  );

  context.subscriptions.push(filesExplorerCopyDisposable);

  async function filesExplorerCopy() {
    fileSystemProvider.copied = await getSelectedUris(fileSystemProvider);

    await filesExplorerCopyDisposable.dispose();

    await vscode.commands.executeCommand("filesExplorer.copy");

    filesExplorerCopyDisposable = vscode.commands.registerCommand(
      "filesExplorer.copy",
      filesExplorerCopy
    );

    context.subscriptions.push(filesExplorerCopyDisposable);
  }
}
