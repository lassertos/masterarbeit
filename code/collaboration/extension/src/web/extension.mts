import * as vscode from "vscode";
import * as Y from "yjs";
import { CollaborationViewProvider } from "./collaborationViewProvider.mjs";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import { CollaborationServiceProsumer } from "@crosslab-ide/crosslab-collaboration-service";
import { ProjectsBinding } from "./projectsBinding.mjs";

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "collaborative-editing" is now active in the web extension host!'
  );

  const projectsBinding = new ProjectsBinding();

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

  // fileSystemApi.onProjectChanged((_project: vscode.Uri) => {
  //   // TODO: add uris for all files contained in the project to an ignore list
  //   // this ensures that the first text document updated event will be
  //   // ignored by the projects-binding otherwise this will lead to issues
  //   // with the synchronization!
  //   projectsBinding.updateTextDocuments();
  // });

  const collaborationServiceProsumer = new CollaborationServiceProsumer(
    "collaboration",
    {
      projects: async () => {
        const initialValue: Record<string, unknown> = {};
        initialValue[collaborationServiceProsumer.id] =
          await projectsBinding.getSharedProjects();
        return initialValue;
      },
    },
    {
      projects: (events, transaction, key) => {
        projectsBinding.handleCollaborationEvent(
          events,
          transaction,
          key,
          collaborationServiceProsumer.id
        );
      },
    }
  );

  collaborationServiceProsumer.on("new-participant", async (participantId) => {
    const sharedProjectsUri = vscode.Uri.from({
      scheme: "crosslabfs",
      path: `/shared/${participantId}`,
    });
    await vscode.workspace.fs.createDirectory(sharedProjectsUri);
    fileSystemApi.addProjectRootFolder(
      `Shared projects: ${participantId}`,
      sharedProjectsUri
    );
  });

  projectsBinding.getValue = (key?: string) => {
    const value = collaborationServiceProsumer.getYjsValue(
      "projects",
      key ?? collaborationServiceProsumer.id
    );
    if (!(value instanceof Y.Map)) {
      throw new Error(`Expected shared projects to be of type "Y.Map"!`);
    }
    return value;
  };

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
