import {
  DebuggingAdapterServiceConsumer,
  Directory,
} from "@crosslab-ide/crosslab-debugging-adapter-service";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import * as vscode from "vscode";
import { DebugAdapterDescriptorFactory } from "./debugAdapterDescriptorFactory.mjs";
import { FileSystemService__Consumer } from "@crosslab-ide/crosslab-filesystem-service";
import { DebugConfigurationProvider } from "./debugConfigurationProvider.mjs";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-debugging-extension" is now active in the web extension host!'
  );

  const fileSystemServiceConsumer = new FileSystemService__Consumer(
    "debugging:filesystem"
  );
  const debuggingAdapterServiceConsumer = new DebuggingAdapterServiceConsumer(
    "debugging:debugging-adapter"
  );

  const fileSystemServiceProducerId = new Promise<string>((resolve) => {
    fileSystemServiceConsumer.once("new-producer", (producerId) =>
      resolve(producerId)
    );
  });

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "crosslab-debugging-extension.debug",
      async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.at(0);

        await vscode.debug.startDebugging(workspaceFolder, {
          name: "CrossLab",
          type: "crosslab",
          request: "attach",
        });
      }
    )
  );

  const debugAdapterDescriptorFactory = new DebugAdapterDescriptorFactory(
    context,
    debuggingAdapterServiceConsumer
  );

  const debugConfigurationProvider = new DebugConfigurationProvider(
    debuggingAdapterServiceConsumer,
    async (
      workspaceFolder: vscode.WorkspaceFolder | undefined
    ): Promise<Directory> => {
      if (!workspaceFolder) {
        throw new Error("No workspace is currently open!");
      }

      return await fileSystemServiceConsumer.readDirectory(
        await fileSystemServiceProducerId,
        workspaceFolder.uri.path
      );
    }
  );

  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      "crosslab",
      debugAdapterDescriptorFactory
    )
  );

  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(
      "crosslab",
      debugConfigurationProvider,
      vscode.DebugConfigurationProviderTriggerKind.Dynamic
    )
  );

  return {
    addServices: (deviceHandler: DeviceHandler) => {
      deviceHandler.addService(fileSystemServiceConsumer);
      deviceHandler.addService(debuggingAdapterServiceConsumer);
    },
  };
}

// This method is called when your extension is deactivated
export function deactivate() {}
