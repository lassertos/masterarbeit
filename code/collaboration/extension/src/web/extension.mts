import * as vscode from "vscode";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import { CollaborationServiceProsumer } from "@crosslab-ide/crosslab-collaboration-service";

export async function activate(_context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "collaborative-editing" is now active in the web extension host!'
  );

  const collaborationServiceProsumer = new CollaborationServiceProsumer(
    "collaboration"
  );

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
