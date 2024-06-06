import * as vscode from "vscode";
import { CollaborationViewProvider } from "./collaborationViewProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "collaborative-editing" is now active in the web extension host!'
  );

  const collaborationViewProvider = new CollaborationViewProvider(
    context.extensionUri
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CollaborationViewProvider.viewType,
      collaborationViewProvider
    )
  );
}

export function deactivate() {}
