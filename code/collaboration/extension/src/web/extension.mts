import * as vscode from "vscode";
import { CollaborationViewProvider } from "./collaborationViewProvider.mjs";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import {
  CollaborationArray,
  CollaborationBoolean,
  CollaborationNumber,
  CollaborationObject,
  CollaborationServiceProsumer,
  CollaborationString,
  CollaborationUpdateEventType,
} from "@crosslab-ide/crosslab-collaboration-service";
import { ProjectsBinding } from "./projectsBinding.mjs";

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "collaborative-editing" is now active in the web extension host!'
  );

  // check for required extensions and their apis
  const fileSystemExtension = vscode.extensions.getExtension(
    "crosslab.@crosslab-ide/crosslab-filesystem-extension"
  );

  if (!fileSystemExtension) {
    throw new Error(
      "This extension requires the extension 'crosslab.@crosslab-ide/crosslab-filesystem-extension'!"
    );
  }

  const fileSystemApi = fileSystemExtension.isActive
    ? fileSystemExtension.exports
    : await fileSystemExtension.activate();

  await fileSystemApi.addMount("/shared", "memory");

  const collaborationServiceProsumer = new CollaborationServiceProsumer(
    "collaboration"
  );

  const projectsBinding = new ProjectsBinding(collaborationServiceProsumer);

  collaborationServiceProsumer.setInitialValue("projects", async () => {
    const initialValue: Record<string, unknown> = {
      projects: {
        [collaborationServiceProsumer.id]:
          await projectsBinding.getSharedProjects(),
      },
    };
    return initialValue;
  });

  collaborationServiceProsumer.on("update", (room, events) => {
    console.log("collaboration: update events", room, events);
    projectsBinding.handleCollaborationEvent(
      events,
      collaborationServiceProsumer.id
    );
    console.log(
      collaborationServiceProsumer
        .getCollaborationValue("projects", "projects", "object")
        .toJSON()
    );
  });

  // collaborationServiceProsumer.on("new-participant", async (participantId) => {
  //   const sharedProjectsUri = vscode.Uri.from({
  //     scheme: "crosslabfs",
  //     path: `/shared/${participantId}`,
  //   });
  //   await vscode.workspace.fs.createDirectory(sharedProjectsUri);
  //   fileSystemApi.addProjectRootFolder(
  //     `Shared projects: ${participantId}`,
  //     sharedProjectsUri
  //   );
  // });

  const collaborationViewProvider = new CollaborationViewProvider(
    context.extensionUri
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CollaborationViewProvider.viewType,
      collaborationViewProvider
    )
  );

  return {
    addServices(deviceHandler: DeviceHandler) {
      console.log("Adding collaboration services!");
      deviceHandler.addService(collaborationServiceProsumer);
      console.log("Successfully added collaboration services!");
    },
  };
}

export function deactivate() {}
