import { CrossLabFileSystemProvider } from "../providers/fileSystemProvider.mjs";
import { getSelectedUris } from "./util.mjs";
import vscode from "vscode";

export function registerFilesExplorerCut(
  context: vscode.ExtensionContext,
  fileSystemProvider: CrossLabFileSystemProvider
) {
  let filesExplorerCutDisposable = vscode.commands.registerCommand(
    "filesExplorer.cut",
    filesExplorerCut
  );

  context.subscriptions.push(filesExplorerCutDisposable);

  async function filesExplorerCut() {
    fileSystemProvider.copied = await getSelectedUris(fileSystemProvider);
    fileSystemProvider.isCutting = fileSystemProvider.copied.length > 0;

    await filesExplorerCutDisposable.dispose();

    await vscode.commands.executeCommand("filesExplorer.cut");

    filesExplorerCutDisposable = vscode.commands.registerCommand(
      "filesExplorer.cut",
      filesExplorerCut
    );

    context.subscriptions.push(filesExplorerCutDisposable);
  }
}
