import { ExtensionContext, Uri } from "vscode";
import { LanguageClientOptions } from "vscode-languageclient";
import * as vscode from "vscode";

import { LanguageClient } from "vscode-languageclient/browser.js";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import {
  LanguageServerConsumer,
  LanguageServerMessagingProtocol,
} from "@crosslab-ide/crosslab-lsp-service";
import { ProtocolMessage } from "@crosslab-ide/abstract-messaging-channel";
import { readDirectory, readEntry } from "./helper.mjs";

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

  languageServerConsumer.on("new-producer", async (producerId) => {
    console.log("lsp: new producer", producerId);
    const projectUri = fileSystemApi.getCurrentProject();
    const info = await languageServerConsumer.initialize(
      producerId,
      await readDirectory(projectUri),
      projectUri.toString()
    );
    const [client] = await createClient(context, projectUri, producerId, info);

    languageServerConsumer.on("message", (pId, message) => {
      if (pId !== producerId) {
        return;
      }
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

    await client.start();

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

  fileSystemApi.onProjectChanged(async (projectUri: vscode.Uri) => {
    for (const [producerId, { client, info }] of clientMap) {
      await stopClient(client);
      const directory = await readDirectory(projectUri);
      console.log("DEBUGGING: initializing lsp");
      const newInfo = await languageServerConsumer.initialize(
        producerId,
        directory,
        projectUri.toString(true)
      );
      console.log("DEBUGGING: initialized lsp");
      const [newClient] = await createClient(
        context,
        projectUri,
        producerId,
        newInfo
      );
      await newClient.start();
    }
  });

  return {
    loadCrosslabServices: (_configuration: { [k: string]: unknown }) => {
      return [languageServerConsumer];
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

  worker.postMessage(
    {
      type: "init",
      data: {
        rootUri: projectUri.toString(),
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
    await languageServerConsumer.sendFilesystemEvent(producerId, {
      type: "created",
      path: uri.path,
      entry: await readEntry(uri),
    });
  });

  fileSystemWatcher.onDidChange(async (uri) => {
    await languageServerConsumer.sendFilesystemEvent(producerId, {
      type: "changed",
      path: uri.path,
      entry: await readEntry(uri),
    });
  });

  fileSystemWatcher.onDidDelete(async (uri) => {
    if (!uri.path.startsWith(projectUri.path + "/")) return;
    await languageServerConsumer.sendFilesystemEvent(producerId, {
      type: "deleted",
      path: uri.path,
    });
  });

  return [client, port1];
}
