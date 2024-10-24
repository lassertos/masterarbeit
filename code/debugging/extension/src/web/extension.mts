import { DebuggingServiceConsumer } from "@crosslab-ide/crosslab-debugging-service";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import * as vscode from "vscode";
import { DebugAdapterDescriptorFactory } from "./debugAdapterDescriptorFactory.mjs";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-debugging-extension" is now active in the web extension host!'
  );

  vscode.commands.registerCommand(
    "crosslab-debugging-extension.debug",
    async () => {
      await vscode.debug.startDebugging(
        vscode.workspace.workspaceFolders
          ? vscode.workspace.workspaceFolders[0]
          : undefined
      );
    }
  );

  const debuggingServiceConsumer = new DebuggingServiceConsumer("debugging");

  const debugAdapterDescriptorFactory = new DebugAdapterDescriptorFactory(
    context,
    debuggingServiceConsumer
  );

  vscode.debug.registerDebugAdapterDescriptorFactory(
    "crosslab",
    debugAdapterDescriptorFactory
  );

  return {
    addServices: (deviceHandler: DeviceHandler) => {
      deviceHandler.addService(debuggingServiceConsumer);
    },
  };
}

// This method is called when your extension is deactivated
export function deactivate() {}
