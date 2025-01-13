import { DebuggingAdapterServiceConsumer } from "@crosslab-ide/crosslab-debugging-adapter-service";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import * as vscode from "vscode";
import { DebugAdapterDescriptorFactory } from "./debugAdapterDescriptorFactory.mjs";
import { FileSystemService__Consumer } from "@crosslab-ide/crosslab-filesystem-service";
import { DebugConfigurationProvider } from "./debugConfigurationProvider.mjs";
import { CollaborationServiceProsumer } from "@crosslab-ide/crosslab-collaboration-service";
import path from "path";
import { Directory } from "@crosslab-ide/filesystem-schemas";

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-debugging-extension" is now active in the web extension host!'
  );

  // check for collaboration extension
  const collaborationExtension = vscode.extensions.all.find(
    (extension) =>
      extension.id === "crosslab.@crosslab-ide/crosslab-collaboration-extension"
  );
  const collaborationApi = collaborationExtension?.isActive
    ? collaborationExtension.exports
    : await collaborationExtension?.activate();
  const collaborationServiceProsumer = collaborationApi?.getProsumer() as
    | CollaborationServiceProsumer
    | undefined;
  if (!collaborationServiceProsumer?.hasRoom("status")) {
    collaborationServiceProsumer?.createRoom("status", "yjs");
  }
  const awareness = collaborationServiceProsumer?.getAwareness("status");
  awareness?.setLocalState({
    ...awareness.getLocalState(),
    isDebugging: false,
  });

  // check for filesystem extension
  const fileSystemExtension = vscode.extensions.all.find(
    (extension) =>
      extension.id === "crosslab.@crosslab-ide/crosslab-filesystem-extension"
  );
  const fileSystemApi = fileSystemExtension?.isActive
    ? fileSystemExtension.exports
    : await fileSystemExtension?.activate();
  fileSystemApi.onProjectChanged(async (projectUri: vscode.Uri) => {
    const project = context.globalState.get("crosslab:debugging:project");
    if (projectUri.path !== project) {
      await vscode.debug.stopDebugging();
    }
    vscode.commands.executeCommand(
      "workbench.debug.viewlet.action.removeAllBreakpoints"
    );
  });

  // create filesystem watcher
  const fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(
      vscode.Uri.from({
        scheme: "crosslabfs",
        path: "/shared",
      }),
      "**/*"
    )
  );
  fileSystemWatcher.onDidCreate(async (event) => {
    const debuggedProject = context.globalState.get<string | null>(
      "crosslab:debugging:project"
    );
    if (event.path === debuggedProject) {
      await vscode.commands.executeCommand(
        "setContext",
        "crosslab.canJoinDebugSession",
        true
      );
    }
  });
  fileSystemWatcher.onDidDelete(async (event) => {
    const debuggedProject = context.globalState.get<string | null>(
      "crosslab:debugging:project"
    );
    if (event.path === debuggedProject) {
      await vscode.commands.executeCommand(
        "setContext",
        "crosslab.canJoinDebugSession",
        false
      );
    }
  });

  awareness?.on("change", async (_changes, origin) => {
    console.log(
      "status-update (debugging):",
      _changes,
      origin,
      Array.from(awareness.getStates().entries())
    );
    if (origin === "local") {
      return;
    }

    const states = awareness.getStates();
    let sessionId = null;
    let project = null;
    for (const [id, state] of states.entries()) {
      if (id === collaborationServiceProsumer?.id) {
        continue;
      }
      sessionId = state.sessionId;
      project = state.project;
      if (sessionId) {
        break;
      }
    }

    project =
      typeof project === "string"
        ? project.startsWith(`/shared/${collaborationServiceProsumer?.id}/`)
          ? project.replace(
              `/shared/${collaborationServiceProsumer?.id}/`,
              "/projects/"
            )
          : project
        : project;

    await context.globalState.update(
      "crosslab:debugging:session-id",
      sessionId
    );
    await context.globalState.update("crosslab:debugging:project", project);

    await vscode.commands.executeCommand(
      "setContext",
      "crosslab.remoteDebugSession",
      sessionId || project
    );

    if (project && typeof project === "string") {
      let exists = true;
      try {
        await vscode.workspace.fs.stat(
          vscode.Uri.from({ scheme: "crosslabfs", path: project })
        );
      } catch {
        exists = false;
      }

      await vscode.commands.executeCommand(
        "setContext",
        "crosslab.canJoinDebugSession",
        exists
      );
    } else {
      await vscode.commands.executeCommand(
        "setContext",
        "crosslab.canJoinDebugSession",
        false
      );
    }
  });

  vscode.debug.onDidStartDebugSession(async (session) => {
    const currentProject = fileSystemApi.getCurrentProject() as vscode.Uri;
    await vscode.commands.executeCommand(
      "setContext",
      "crosslab.isDebugging",
      true
    );
    awareness?.setLocalState({
      ...awareness?.getLocalState(),
      isDebugging: true,
      sessionId: session.configuration.isLocal
        ? session.configuration.sessionId
        : null,
      project: session.configuration.isLocal
        ? currentProject.path.startsWith("/projects/")
          ? currentProject.path.replace(
              "/projects/",
              `/shared/${collaborationServiceProsumer?.id}/`
            )
          : currentProject.path.startsWith("/shared/")
          ? currentProject.path
          : null
        : null,
    });
  });

  vscode.debug.onDidTerminateDebugSession(async () => {
    await vscode.commands.executeCommand(
      "setContext",
      "crosslab.isDebugging",
      false
    );
    awareness?.setLocalState({
      ...awareness?.getLocalState(),
      isDebugging: false,
      sessionId: null,
      project: null,
    });
  });

  const debugProvider = new (class
    implements vscode.TextDocumentContentProvider
  {
    async provideTextDocumentContent(
      uri: vscode.Uri,
      _token: vscode.CancellationToken
    ): Promise<string> {
      if (!vscode.debug.activeDebugSession) {
        return `Cannot retrieve file ${uri.path}: No active debugging session!`;
      }

      const response = await vscode.debug.activeDebugSession.customRequest(
        "source",
        {
          source: {
            name: path.basename(uri.path) + "test",
            path: uri.path,
            sourceReference: 0,
          },
          sourceReference: 0,
        }
      );
      console.log("DEBUGGING:", response);

      return response.content ? response.content : response.error;
    }
  })();

  vscode.workspace.registerTextDocumentContentProvider(
    "crosslab-remote",
    debugProvider
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

  const producers: string[] = [];
  debuggingAdapterServiceConsumer.on("new-producer", (producerId) => {
    producers.push(producerId);
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
          producerId: producers[0],
          isLocal: true,
        });
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "crosslab-debugging-extension.join-debug-session",
      async () => {
        const sessionId = context.globalState.get(
          "crosslab:debugging:session-id"
        );
        const project = context.globalState.get("crosslab:debugging:project");

        if (
          !sessionId ||
          !project ||
          typeof sessionId !== "string" ||
          typeof project !== "string"
        ) {
          throw new Error(`No active remote session found!`);
        }

        if (fileSystemApi.getCurrentProject().path !== project) {
          await fileSystemApi.changeProject(
            vscode.Uri.from({ scheme: "crosslabfs", path: project })
          );
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.at(0);

        await vscode.debug.startDebugging(workspaceFolder, {
          name: "CrossLab",
          type: "crosslab",
          request: "attach",
          sessionId,
          producerId: producers[0],
          isLocal: false,
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
