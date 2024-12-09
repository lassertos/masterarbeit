import * as vscode from "vscode";
// import { CollaborationViewProvider } from "./collaborationViewProvider.mjs";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import { CollaborationServiceProsumer } from "@crosslab-ide/crosslab-collaboration-service";

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "collaborative-editing" is now active in the web extension host!'
  );

  const collaborationServiceProsumer = new CollaborationServiceProsumer(
    "collaboration"
  );

  // const collaborationViewProvider = new CollaborationViewProvider(
  //   context.extensionUri
  // );

  // context.subscriptions.push(
  //   vscode.window.registerWebviewViewProvider(
  //     CollaborationViewProvider.viewType,
  //     collaborationViewProvider
  //   )
  // );

  return {
    addServices(deviceHandler: DeviceHandler) {
      console.log("Adding collaboration services!");
      deviceHandler.addService(collaborationServiceProsumer);
      console.log("Successfully added collaboration services!");
    },
    getProsumer() {
      return collaborationServiceProsumer;
    },
  };
}

export function deactivate() {}
