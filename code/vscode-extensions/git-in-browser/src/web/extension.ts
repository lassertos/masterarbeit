import * as vscode from "vscode";
import path from "path";
import { GitBaseExtension } from "./git-base";
// import git from "isomorphic-git";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "git-in-browser" is now active in the web extension host!'
  );

  const gitBaseExtension =
    vscode.extensions.getExtension<GitBaseExtension>(
      "vscode.git-base"
    )?.exports;
  const git = gitBaseExtension?.getAPI(1);
  git?.registerRemoteSourceProvider({
    getRemoteSources(query) {
      return [
        {
          name: "Test Remote Source",
          url: "https://github.com/Cross-Lab-Project/crosslab",
        },
      ];
    },
    getBranches(url) {
      return ["main"];
    },
    name: "Test Remote Source Provider",
  });
  git?.pickRemoteSource({ branch: true }).then((result) => {
    console.log(result);
  });
}

export function deactivate() {}
