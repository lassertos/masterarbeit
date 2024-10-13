import { CrossLabFileSystemProvider } from "../providers/fileSystemProvider.mjs";
import { copyEntry, getSelectedUris } from "./util.mjs";
import path from "path";
import vscode from "vscode";

export function registerFilesExplorerPaste(
  context: vscode.ExtensionContext,
  fileSystemProvider: CrossLabFileSystemProvider
) {
  let filesExplorerPasteDisposable = vscode.commands.registerCommand(
    "filesExplorer.paste",
    filesExplorerPaste
  );

  context.subscriptions.push(filesExplorerPasteDisposable);

  async function filesExplorerPaste() {
    if (fileSystemProvider.copied.length === 0) {
      return;
    }

    const selected =
      (await getSelectedUris(fileSystemProvider)).at(-1) ??
      vscode.Uri.from({
        scheme: "crosslabfs",
        path: fileSystemProvider.currentProject
          ? `/projects/${fileSystemProvider.currentProject}`
          : "/workspace",
      });

    const copiedToUri = selected;

    console.log(copiedToUri);

    const isDirectory =
      (await fileSystemProvider.stat(copiedToUri)).type ===
      vscode.FileType.Directory;

    console.log(isDirectory);

    const copiedTo = isDirectory
      ? copiedToUri
      : copiedToUri.with({ path: path.dirname(copiedToUri.path) });

    console.log("wrote copiedTo:", copiedTo);

    let lastCopied = undefined;
    for (const copy of fileSystemProvider.copied) {
      const name = path.basename(copy.path);

      if (fileSystemProvider.isCutting) {
        try {
          if (copy.path !== copiedTo.path) {
            await fileSystemProvider.rename(
              copy,
              vscode.Uri.joinPath(copiedTo, name)
            );
          }
          lastCopied = vscode.Uri.joinPath(copiedTo, name);
        } catch (error) {
          if (error instanceof Error) {
            vscode.window.showErrorMessage(error.message);
          }
        }
      } else {
        lastCopied = await copyEntry(copy, vscode.Uri.joinPath(copiedTo, name));
      }
    }

    if (fileSystemProvider.isCutting) {
      await vscode.commands.executeCommand("filesExplorer.cancelCut");
      fileSystemProvider.isCutting = false;
    }

    await vscode.commands.executeCommand(
      "workbench.files.action.refreshFilesExplorer"
    );

    // TODO: fix reveal in explorer!
    console.log(lastCopied);
    if (lastCopied) {
      await vscode.commands.executeCommand(
        "revealInExplorer",
        vscode.Uri.joinPath(
          lastCopied.with({
            path: lastCopied.path.startsWith(`/projects/`)
              ? lastCopied.path.replace(
                  `/projects/${fileSystemProvider.currentProject}/`,
                  "/workspace/"
                )
              : lastCopied.path,
          })
        )
      );
    }
  }
}
