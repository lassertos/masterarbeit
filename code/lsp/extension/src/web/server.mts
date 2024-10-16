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
          resolve([event.data.data.projectName, event.ports[0]]);
        }
        self.onmessage = null;
      }
    })
).then(([projectName, port]) => {
  const messageReader = new BrowserMessageReader(self);
  const messageWriter = new BrowserMessageWriter(self);

  port.onmessage = (event) => {
    console.log("sending command:", event.data);
    webSocket.send(JSON.stringify(event.data));
  };

  let path = "";

  const webSocket = new WebSocket("ws://localhost:3025");

  webSocket.onclose = () => {
    console.log(`webSocket connection has been closed`);
  };

  webSocket.onerror = () => {
    console.error(`webSocket: An error has occurred!`);
  };

  webSocket.onmessage = (event) => {
    const message = JSON.parse(event.data.toString());

    console.log(message);

    if (message.type === "path") {
      port.postMessage(message.data);
      path = message.data;
      return;
    }

    const data = JSON.parse(message.data);

    console.log(`incoming:`, data);
    messageWriter.write(data);
  };

  webSocket.onopen = () => {
    console.log("webSocket connection has been established!");
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
      console.log("updating initialize message");
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
    webSocket.send(JSON.stringify({ type: "data", data: messageString }));
  }

  // Track open, change and close text document events
  const documents = new TextDocuments(TextDocument);
  documents.listen(connection);

  connection.listen();
  console.log("connection is listening!");
});
