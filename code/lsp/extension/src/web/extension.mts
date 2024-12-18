import { ExtensionContext, Uri } from "vscode";
import { LanguageClientOptions } from "vscode-languageclient";
import * as vscode from "vscode";

import { LanguageClient } from "vscode-languageclient/browser.js";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import path from "path";
import {
  LanguageServerConsumer,
  LanguageServerMessagingProtocol,
} from "@crosslab-ide/crosslab-lsp-service";
import { ProtocolMessage } from "@crosslab-ide/abstract-messaging-channel";

const clientMap: Map<
  string,
  {
    client: LanguageClient;
    messagePort: MessagePort;
    info: ProtocolMessage<
      LanguageServerMessagingProtocol,
      "lsp:initialization:response"
    >["content"];
  }
> = new Map();

const languageServerConsumer = new LanguageServerConsumer("lsp-extension:lsp");

export async function activate(context: ExtensionContext) {
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

  languageServerConsumer.on("new-producer", async (producerId, info) => {
    console.log("lsp: new producer", producerId);
    const projectUri = fileSystemApi.getCurrentProject();
    await createClient(context, projectUri, producerId, info);

    const remoteProvider = new (class
      implements vscode.TextDocumentContentProvider
    {
      async provideTextDocumentContent(
        uri: vscode.Uri,
        _token: vscode.CancellationToken
      ): Promise<string> {
        console.log("DEBUGGING: trying to retrieve content for file", uri.path);
        try {
          const { content } = await languageServerConsumer.readFile(
            producerId,
            uri.path
          );
          console.log("DEBUGGING:", content);
          return content;
        } catch (error) {
          return error instanceof Error
            ? error.message
            : `Could retrieve file ${uri.path}!`;
        }
      }
    })();

    vscode.workspace.registerTextDocumentContentProvider(
      "crosslab-remote",
      remoteProvider
    );
  });

  languageServerConsumer.on("message", (producerId, message) => {
    console.log(
      "lsp: message",
      producerId,
      message,
      Array.from(clientMap.entries())
    );
    const clientInfo = clientMap.get(producerId);
    if (!clientInfo) {
      throw new Error(
        `Could not find information for client with id "${producerId}"!"`
      );
    }

    if (message.type === "lsp:message") {
      clientInfo.messagePort.postMessage(message.content);
    }
  });

  fileSystemApi.onProjectChanged(async (project: vscode.Uri) => {
    for (const [producerId, { client, info }] of clientMap) {
      await languageServerConsumer.delete(
        producerId,
        path.join(info.sourcesPath, path.basename(project.path))
      );
      await stopClient(client);
      const { content: newInfo } = await languageServerConsumer.initialize(
        producerId
      );
      await createClient(context, project, producerId, newInfo);
    }
  });

  return {
    addServices: (deviceHandler: DeviceHandler) => {
      console.log("adding lsp service!");
      deviceHandler.addService(languageServerConsumer);
      console.log("added lsp service!");
    },
  };
}

export async function deactivate(): Promise<void> {
  for (const { client } of clientMap.values()) {
    await stopClient(client);
  }
}

async function stopClient(client: LanguageClient): Promise<void> {
  if (client?.isRunning()) {
    await client.stop();
    await client.dispose();
  }
}

async function createClient(
  context: ExtensionContext,
  projectUri: vscode.Uri,
  producerId: string,
  info: ProtocolMessage<
    LanguageServerMessagingProtocol,
    "lsp:initialization:response"
  >["content"]
): Promise<[LanguageClient, MessagePort]> {
  // Create a worker. The worker main file implements the language server.
  const serverMain = Uri.joinPath(context.extensionUri, "dist/web/server.js");
  const worker = new Worker(serverMain.toString(true));
  const { port1, port2 } = new MessageChannel();

  const projectName = path.basename(projectUri.path);

  worker.postMessage(
    {
      type: "init",
      data: {
        path: info.sourcesPath,
        projectName,
      },
    },
    [port2]
  );

  port1.onmessage = async (event) => {
    console.log("lsp: message on port", producerId, event.data);
    await languageServerConsumer.sendLspMessage(producerId, event.data);
  };

  const fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(projectUri, "*")
  );

  const clientOptions: LanguageClientOptions = {
    ...info.configuration,
    uriConverters: {
      code2Protocol: (value) => {
        return value
          .with({
            scheme: "file",
            path: value.path.startsWith(projectUri.path)
              ? value.path.replace(
                  projectUri.path,
                  `${info.sourcesPath}/${projectName}`
                )
              : value.path.replace(
                  "/workspace",
                  `${info.sourcesPath}/${projectName}`
                ),
          })
          .toString(true);
      },
      protocol2Code: (value) => {
        const uri = vscode.Uri.parse(value);

        if (uri.path.startsWith(info.sourcesPath)) {
          return uri.with({
            scheme: "crosslabfs",
            path: uri.path.replace(
              `${info.sourcesPath}/${projectName}`,
              "/workspace"
            ),
          });
        }

        return uri.with({
          scheme: "crosslab-remote",
          path: uri.path,
        });
      },
    },
  };

  const client = new LanguageClient(
    "crosslab-language-client",
    "CrossLab Language Client",
    clientOptions,
    worker
  );

  client.error = () => {};

  clientMap.set(producerId, { client, messagePort: port1, info });

  fileSystemWatcher.onDidCreate(async (uri) => {
    const isDirectory =
      (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
    if (!uri.path.startsWith(projectUri.path + "/")) return;

    if (isDirectory) {
      await languageServerConsumer.createDirectory(
        producerId,
        uri.path.replace(
          projectUri.path,
          path.join(info.sourcesPath, projectName)
        )
      );
    } else {
      await languageServerConsumer.writeFile(
        producerId,
        uri.path.replace(
          projectUri.path,
          path.join(info.sourcesPath, projectName)
        ),
        new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))
      );
    }
  });

  fileSystemWatcher.onDidDelete(async (uri) => {
    if (!uri.path.startsWith(projectUri.path + "/")) return;
    await languageServerConsumer.delete(
      producerId,
      uri.path.replace(
        projectUri.path,
        path.join(info.sourcesPath, projectName)
      )
    );
  });

  await client.start();

  await setupDirectory(
    vscode.Uri.from({ scheme: "crosslabfs", path: "/workspace" }),
    path.join(info.sourcesPath, projectName),
    producerId
  );

  return [client, port1];
}

async function setupDirectory(
  directoryUri: vscode.Uri,
  pathReplacement: string,
  producerId: string
) {
  await languageServerConsumer.createDirectory(
    producerId,
    directoryUri.path.replace("/workspace", pathReplacement)
  );
  const entries = await vscode.workspace.fs.readDirectory(directoryUri);
  for (const entry of entries) {
    const entryUri = directoryUri.with({
      path: path.join(directoryUri.path, entry[0]),
    });
    switch (entry[1]) {
      case vscode.FileType.Unknown:
        break;
      case vscode.FileType.File:
        await languageServerConsumer.writeFile(
          producerId,
          entryUri.path.replace("/workspace", pathReplacement),
          new TextDecoder().decode(await vscode.workspace.fs.readFile(entryUri))
        );
        break;
      case vscode.FileType.Directory:
        await setupDirectory(
          directoryUri.with({ path: path.join(directoryUri.path, entry[0]) }),
          pathReplacement,
          producerId
        );
        break;
      case vscode.FileType.SymbolicLink:
        break;
    }
  }
}
