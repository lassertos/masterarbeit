import { ExtensionContext, Uri } from "vscode";
import { LanguageClientOptions } from "vscode-languageclient";
import * as vscode from "vscode";

import { LanguageClient } from "vscode-languageclient/browser.js";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import {
  MessageService__Consumer,
  MessageService__Producer,
} from "@crosslab-ide/soa-service-message";
import path from "path";

let client: LanguageClient | undefined;
// this method is called when vs code is activated
export async function activate(context: ExtensionContext) {
  console.log("crosslab-lsp activated!");

  console.log("crosslab-lsp server is ready");

  const messageServiceConsumer = new MessageService__Consumer(
    "crosslab:lsp:in"
  );
  const messageServiceProducer = new MessageService__Producer(
    "crosslab:lsp:out"
  );

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

  fileSystemApi.onProjectChanged(async (project: vscode.Uri) => {
    await stopClient();
    await startClient(context, project);
  });

  await startClient(context, fileSystemApi.getCurrentProject());

  return {
    addService: (deviceHandler: DeviceHandler) => {
      deviceHandler.addService(messageServiceConsumer);
      deviceHandler.addService(messageServiceProducer);
    },
  };
}

export async function deactivate(): Promise<void> {
  await stopClient();
}

async function stopClient(): Promise<void> {
  await client?.stop();
}

async function startClient(context: ExtensionContext, projectUri: vscode.Uri) {
  // Create a worker. The worker main file implements the language server.
  const serverMain = Uri.joinPath(context.extensionUri, "dist/web/server.js");
  const worker = new Worker(serverMain.toString(true));
  const { port1: commandPort1, port2: commandPort2 } = new MessageChannel();

  const projectName = path.basename(projectUri.path);

  worker.postMessage(
    {
      type: "init",
      data: {
        projectName,
      },
    },
    [commandPort2]
  );

  const lspPath = await new Promise<string>(
    (resolve) =>
      (commandPort1.onmessage = (event) => {
        resolve(event.data);
        commandPort1.onmessage = null;
      })
  );

  console.log("received path", lspPath);

  const fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(projectUri, "*")
  );

  fileSystemWatcher.onDidCreate(async (uri) => {
    console.log("created", uri);
    if (!uri.path.startsWith(projectUri.path + "/")) return;
    commandPort1.postMessage({
      type: "filesystem:create",
      data: {
        type:
          (await vscode.workspace.fs.stat(uri)).type ===
          vscode.FileType.Directory
            ? "directory"
            : "file",
        path: uri.path.replace(
          projectUri.path,
          path.join(lspPath, projectName)
        ),
        content: "",
      },
    });
    await vscode.commands.executeCommand("workbench.action.files.saveFiles");
    await vscode.commands.executeCommand("workbench.action.files.save");
  });

  fileSystemWatcher.onDidDelete(async (uri) => {
    console.log("deleted", uri);
    if (!uri.path.startsWith(projectUri.path + "/")) return;
    commandPort1.postMessage({
      type: "filesystem:delete",
      data: {
        type:
          (await vscode.workspace.fs.stat(uri)).type ===
          vscode.FileType.Directory
            ? "directory"
            : "file",
        path: uri.path.replace(
          projectUri.path,
          path.join(lspPath, projectName)
        ),
      },
    });
  });

  await setupDirectory(
    vscode.Uri.from({ scheme: "crosslabfs", path: "/workspace" }),
    path.join(lspPath, projectName),
    commandPort1
  );

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: "c" }, { language: "cpp" }],
    // synchronize: { fileEvents: fileSystemWatcher },
    initializationOptions: {},
    uriConverters: {
      code2Protocol: (value) => {
        return value
          .with({
            scheme: "file",
            path: value.path.replace("/workspace", `${lspPath}/${projectName}`),
          })
          .toString();
      },
      protocol2Code: (value) => {
        const uri = vscode.Uri.parse(value);
        return uri.with({
          scheme: "crosslabfs",
          path: uri.path.replace(`${lspPath}/${projectName}`, "/workspace"),
        });
      },
    },
  };

  // create the language server client to communicate with the server running in the worker
  client = new LanguageClient(
    "crosslab-language-client",
    "CrossLab Language Client",
    clientOptions,
    worker
  );

  await client.start();
}

async function setupDirectory(
  directoryUri: vscode.Uri,
  pathReplacement: string,
  port: MessagePort
) {
  port.postMessage({
    type: "filesystem:create",
    data: {
      type: "directory",
      path: directoryUri.path.replace("/workspace", pathReplacement),
    },
  });
  const entries = await vscode.workspace.fs.readDirectory(directoryUri);
  for (const entry of entries) {
    switch (entry[1]) {
      case vscode.FileType.Unknown:
        break;
      case vscode.FileType.File:
        port.postMessage({
          type: "filesystem:create",
          data: {
            type: "file",
            path: path
              .join(directoryUri.path, entry[0])
              .replace("/workspace", pathReplacement),
            content: new TextDecoder().decode(
              await vscode.workspace.fs.readFile(
                directoryUri.with({
                  path: path.join(directoryUri.path, entry[0]),
                })
              )
            ),
          },
        });
        break;
      case vscode.FileType.Directory:
        await setupDirectory(
          directoryUri.with({ path: path.join(directoryUri.path, entry[0]) }),
          pathReplacement,
          port
        );
        break;
      case vscode.FileType.SymbolicLink:
        break;
    }
  }
}
