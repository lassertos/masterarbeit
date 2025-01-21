import * as vscode from "vscode";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import { CompilationService__Consumer } from "@crosslab-ide/crosslab-compilation-service";
import { FileSystemService__Consumer } from "@crosslab-ide/crosslab-filesystem-service";
import { CollaborationServiceProsumer } from "@crosslab-ide/crosslab-collaboration-service";
import { ProgrammingServiceConsumer } from "@crosslab-ide/crosslab-programming-service";

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-compilation-extension" is now active in the web extension host!'
  );

  // check for collaboration extension
  const collaborationExtension = vscode.extensions.all.find(
    (extension) =>
      extension.id === "crosslab.@crosslab-ide/crosslab-collaboration-extension"
  );
  const collaborationApi = collaborationExtension?.isActive
    ? collaborationExtension?.exports
    : undefined;
  const collaborationServiceProsumer = collaborationApi?.getProsumer() as
    | CollaborationServiceProsumer
    | undefined;
  if (!collaborationServiceProsumer?.hasRoom("status")) {
    collaborationServiceProsumer?.createRoom("status", "yjs");
  }
  const awareness = collaborationServiceProsumer?.getAwareness("status");
  awareness?.setLocalState({
    ...awareness.getLocalState(),
    isCompiling: false,
  });

  awareness?.on("change", async (_changes, origin) => {
    console.log(
      "status-update (compilation):",
      _changes,
      origin,
      Array.from(awareness.getStates().entries())
    );
    if (origin === "local") {
      return;
    }

    const states = awareness.getStates();
    let isCompiling = false;
    for (const state of states.values()) {
      isCompiling ||= !!state.isCompiling;
    }

    await vscode.commands.executeCommand(
      "setContext",
      "crosslab.isCompiling",
      isCompiling
    );
  });

  const fileSystemService__Consumer = new FileSystemService__Consumer(
    "compilation:filesystem"
  );
  const compilationService__Consumer = new CompilationService__Consumer(
    "compilation"
  );
  const programmingService__Consumer = new ProgrammingServiceConsumer(
    "programming"
  );

  const programmingTargetId = new Promise<string>((resolve) =>
    programmingService__Consumer.on("new-producer", (producerId) => {
      resolve(producerId);
    })
  );

  const outputchannel = vscode.window.createOutputChannel("compilation");

  const compilationServiceProducerId = new Promise<string>((resolve) => {
    compilationService__Consumer.once("new-producer", (producerId) =>
      resolve(producerId)
    );
  });

  const fileSystemServiceProducerId = new Promise<string>((resolve) => {
    fileSystemService__Consumer.once("new-producer", (producerId) =>
      resolve(producerId)
    );
  });

  async function compile(upload: boolean = false) {
    awareness?.setLocalStateField("isCompiling", true);

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
      awareness?.setLocalStateField("isCompiling", false);
      vscode.window.showInformationMessage(
        "Unable to compile since no workspace folder is open!"
      );
      await vscode.commands.executeCommand(
        "setContext",
        "crosslab.isCompiling",
        false
      );
      return;
    }

    const directory = await fileSystemService__Consumer.readDirectory(
      await fileSystemServiceProducerId,
      workspaceFolder.uri.path
    );

    const result = await compilationService__Consumer.compile(
      await compilationServiceProducerId,
      directory
    );

    outputchannel.clear();
    await vscode.commands.executeCommand("workbench.panel.output.focus");
    outputchannel.show();
    outputchannel.appendLine("starting compilation!\n");

    outputchannel.appendLine(
      result.success
        ? result.message ?? "The compilation was successful!"
        : result.message ?? "Something went wrong during the compilation!"
    );

    if (result.success && result.result.type === "file" && upload) {
      outputchannel.appendLine("Uploading result!");
      await programmingService__Consumer.program(
        await programmingTargetId,
        result.result
      );
      outputchannel.appendLine("Uploaded result!");
    }

    awareness?.setLocalStateField("isCompiling", false);

    await vscode.commands.executeCommand(
      "setContext",
      "crosslab.isCompiling",
      false
    );
  }

  const compileDisposable = vscode.commands.registerCommand(
    "crosslab-compilation-extension.compile",
    async () => {
      await compile();
    }
  );

  const uploadDisposable = vscode.commands.registerCommand(
    "crosslab-compilation-extension.upload",
    async () => {
      await compile(true);
    }
  );

  context.subscriptions.push(compileDisposable, uploadDisposable);

  return {
    loadCrosslabServices: (_configuration: { [k: string]: unknown }) => {
      return [
        fileSystemService__Consumer,
        compilationService__Consumer,
        programmingService__Consumer,
      ];
    },
  };
}

export function deactivate() {}
