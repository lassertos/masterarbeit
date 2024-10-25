import * as vscode from "vscode";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import { CompilationService__Consumer } from "@crosslab-ide/crosslab-compilation-service";
import { FileSystemService__Consumer } from "@crosslab-ide/crosslab-filesystem-service";
import { FileService__Producer } from "@crosslab-ide/soa-service-file";

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
  const fileService__Producer = new FileService__Producer("compilation:file");

  const outputchannel = vscode.window.createOutputChannel("compilation");

  const compileDisposable = vscode.commands.registerCommand(
    "crosslab-compilation-extension.compile",
    async () => {
      await vscode.commands.executeCommand(
        "setContext",
        "crosslab.isCompiling",
        true
      );

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

      const directory = await fileSystemService__Consumer.readDirectory(
        workspaceFolder.uri.path
      );

      const result = await compilationService__Consumer.compile(directory);

      outputchannel.clear();
      await vscode.commands.executeCommand("workbench.panel.output.focus");
      outputchannel.show();
      outputchannel.appendLine("starting compilation!\n");

      outputchannel.appendLine(
        result.success
          ? result.message ?? "The compilation was successful!"
          : result.message ?? "Something went wrong during the compilation!"
      );

      if (result.success && result.result.type === "file") {
        outputchannel.appendLine("Uploading result!");
        await fileService__Producer.sendFile("elf", result.result.content);
        outputchannel.appendLine("Uploaded result!");
      }

      await vscode.commands.executeCommand(
        "setContext",
        "crosslab.isCompiling",
        false
      );
    }
  );

  context.subscriptions.push(compileDisposable);

  return {
    addServices: (deviceHandler: DeviceHandler) => {
      console.log("adding compilation services!");
      deviceHandler.addService(fileSystemService__Consumer);
      deviceHandler.addService(compilationService__Consumer);
      deviceHandler.addService(fileService__Producer);
      console.log("added compilation services!");
    },
  };
}

export function deactivate() {}
