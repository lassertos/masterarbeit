import * as vscode from "vscode";
import { parseDirectory } from "./util/parseDirectory.mjs";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-compilation-extension" is now active in the web extension host!'
  );

  const helloWorldDisposable = vscode.commands.registerCommand(
    "crosslab-compilation-extension.helloWorld",
    () => {
      vscode.window.showInformationMessage(
        "Hello World from crosslab-compilation-extension in a web extension host!"
      );
    }
  );

  const compileDisposable = vscode.commands.registerCommand(
    "crosslab-compilation-extension.compile",
    async () => {
      vscode.window.showInformationMessage("Trying to compile!");

      const workspaceFolder =
        Array.isArray(vscode.workspace.workspaceFolders) &&
        vscode.workspace.workspaceFolders.length > 0
          ? (vscode.workspace.workspaceFolders[0] as vscode.WorkspaceFolder)
          : undefined;

      if (!workspaceFolder) {
        vscode.window.showInformationMessage(
          "Unable to compile since no workspace folder is open!"
        );
        return;
      }

      const directory = await parseDirectory(workspaceFolder.uri);

      console.log(JSON.stringify(directory, null, 4));
    }
  );

  context.subscriptions.push(helloWorldDisposable, compileDisposable);
}

export function deactivate() {}
