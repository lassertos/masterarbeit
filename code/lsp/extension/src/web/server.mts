import { TextDocument } from "vscode-languageserver-textdocument";
import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createConnection,
  Message,
  TextDocuments,
} from "vscode-languageserver/browser.js";

console.log("running server lsp-crosslab");

new Promise<[string, string, MessagePort]>(
  (resolve) =>
    (self.onmessage = (event) => {
      if (event.data.type === "init") {
        if (event.ports.length > 0) {
          resolve([
            event.data.data.path,
            event.data.data.projectName,
            event.ports[0],
          ]);
        }
        self.onmessage = null;
      }
    })
).then(([path, projectName, port]) => {
  const messageReader = new BrowserMessageReader(self);
  const messageWriter = new BrowserMessageWriter(self);

  port.onmessage = (event) => {
    const message = JSON.parse(event.data.toString());
    console.log(`incoming:`, message);
    messageWriter.write(message);
  };

  const connection = createConnection(messageReader, messageWriter, {
    messageStrategy: {
      handleMessage: async (message) => {
        console.log("handling message!");
        await handleMessage(message);
      },
    },
  });

  async function handleMessage(message: Message) {
    console.log(message);
    if ("method" in message && message.method === "initialize") {
      (message as any).params.rootUri = `file://${path}/${projectName}`;
      (
        message as any
      ).params.capabilities.workspace.semanticTokens.refreshSupport = false;
      (
        message as any
      ).params.capabilities.workspace.didChangeWatchedFiles.dynamicRegistration =
        false;
      (
        message as any
      ).params.capabilities.workspace.didChangeWatchedFiles.relativePatternSupport =
        false;
    }
    const messageString = JSON.stringify(message);
    console.log("outgoing:", messageString);
    port.postMessage(JSON.stringify(message));
  }

  // Track open, change and close text document events
  const documents = new TextDocuments(TextDocument);
  documents.listen(connection);

  connection.listen();
  console.log("connection is listening!");
});
