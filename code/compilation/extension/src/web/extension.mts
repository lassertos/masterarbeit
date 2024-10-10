import * as vscode from "vscode";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import { CompilationService__Consumer } from "@crosslab-ide/crosslab-compilation-service";
import { FileSystemService__Consumer } from "@crosslab-ide/crosslab-filesystem-service";
import { Directory } from "@crosslab-ide/filesystem-messaging-protocol";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-compilation-extension" is now active in the web extension host!'
  );
  const fileSystemService__Consumer = new FileSystemService__Consumer(
    "compilation:filesystem"
  );
  const compilationService__Consumer = new CompilationService__Consumer(
    "compilation"
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

      console.log(workspaceFolder);

      const directory: Directory = {
        type: "directory",
        name: workspaceFolder.name,
        content: await fileSystemService__Consumer.readDirectory(
          workspaceFolder.uri.path
        ),
      };

      console.log(JSON.stringify(directory, null, 4));

      const result = await compilationService__Consumer.compile(
        directory.content[0] as Directory
      );

      await fileSystemService__Consumer.writeFile(
        "/projects/compilation-result.txt",
        result.success
          ? result.result
          : result.message ?? "Something went wrong during the compilation!"
      );
    }
  );

  const uploadDisposable = vscode.commands.registerCommand(
    "crosslab-compilation-extension.upload",
    async () => {
      vscode.window.showInformationMessage("Trying to upload!");

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

      const directory: Directory = {
        type: "directory",
        name: workspaceFolder.name,
        content: await fileSystemService__Consumer.readDirectory(
          workspaceFolder.uri.path
        ),
      };

      console.log(JSON.stringify(directory, null, 4));

      const result = await compilationService__Consumer.compile(directory);

      await fileSystemService__Consumer.writeFile(
        "/projects/compilation-result.txt",
        result.success
          ? result.result
          : result.message ?? "Something went wrong during the compilation!"
      );
    }
  );

  context.subscriptions.push(compileDisposable);
  context.subscriptions.push(uploadDisposable);

  return {
    addServices: (deviceHandler: DeviceHandler) => {
      console.log("adding compilation services!");
      deviceHandler.addService(fileSystemService__Consumer);
      deviceHandler.addService(compilationService__Consumer);
      console.log("added compilation services!");
    },
  };
}

export function deactivate() {}
