import * as vscode from "vscode";
import git from "isomorphic-git";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "git-in-browser" is now active in the web extension host!'
  );

  const gitSCM = vscode.scm.createSourceControl("git", "git");
  const resourceGroup = gitSCM.createResourceGroup("index", "index");
}

export function deactivate() {}
