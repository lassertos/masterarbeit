import { ExtensionContext, Uri } from "vscode";
import { LanguageClientOptions } from "vscode-languageclient";
import * as vscode from "vscode";

import { LanguageClient } from "vscode-languageclient/browser";

let client: LanguageClient | undefined;
// this method is called when vs code is activated
export async function activate(context: ExtensionContext) {
  console.log("crosslab-lsp activated!");

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: "c" }, { language: "cpp" }],
    synchronize: {},
    initializationOptions: {},
  };

  client = await createWorkerLanguageClient(context, clientOptions);

  await client.start();
  console.log("crosslab-lsp server is ready");
}

export async function deactivate(): Promise<void> {
  if (client !== undefined) {
    await client.stop();
  }
}

async function createWorkerLanguageClient(
  context: ExtensionContext,
  clientOptions: LanguageClientOptions
) {
  // Create a worker. The worker main file implements the language server.
  const serverMain = Uri.joinPath(context.extensionUri, "dist/web/server.js");
  const worker = new Worker(serverMain.toString(true));

  // create a fileSystemWatcher
  const fileSystemWatcher =
    vscode.workspace.createFileSystemWatcher("**/*.{c,h}");

  fileSystemWatcher.onDidChange(async (uri) => {
    const content = await vscode.workspace.fs.readFile(uri);
    worker.postMessage({
      type: "file-event",
      event: "change",
      path: uri.path,
      content: new TextDecoder().decode(content),
    });
  });
  fileSystemWatcher.onDidCreate(async (uri) => {
    worker.postMessage({
      type: "file-event",
      event: "create",
      path: uri.path,
    });
  });
  fileSystemWatcher.onDidDelete(async (uri) => {
    worker.postMessage({
      type: "file-event",
      event: "delete",
      path: uri.path,
    });
  });

  // create the language server client to communicate with the server running in the worker
  return new LanguageClient(
    "lsp-web-extension-sample",
    "LSP Web Extension Sample",
    clientOptions,
    worker
  );
}
