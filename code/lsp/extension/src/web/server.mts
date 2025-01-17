import { TextDocument } from "vscode-languageserver-textdocument";
import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createConnection,
  Message,
  TextDocuments,
} from "vscode-languageserver/browser.js";

console.log("running server lsp-crosslab");

new Promise<[string, MessagePort]>(
  (resolve) =>
    (self.onmessage = (event) => {
      if (event.data.type === "init") {
        if (event.ports.length > 0) {
          resolve([event.data.data.rootUri, event.ports[0]]);
        }
        self.onmessage = null;
      }
    })
).then(([rootUri, port]) => {
  const messageReader = new BrowserMessageReader(self);
  const messageWriter = new BrowserMessageWriter(self);

  port.onmessage = (event) => {
    const message = event.data.toString();
    const parsedMessage = JSON.parse(event.data.toString());
    console.log(`incoming:`, parsedMessage);
    messageWriter.write(
      JSON.parse(
        message
          .replace(new RegExp(rootUri, "g"), "crosslabfs:/workspace")
          .replace(/file:\/\//, "crosslab-remote:")
      )
    );
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
      (message as any).params.rootUri = rootUri;
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
    port.postMessage(
      messageString
        .replace(/crosslabfs:\/workspace/g, rootUri)
        .replace(/crosslab-remote:/, "file://")
    );
  }

  // Track open, change and close text document events
  const documents = new TextDocuments(TextDocument);
  documents.listen(connection);

  connection.listen();
  console.log("connection is listening!");
});
