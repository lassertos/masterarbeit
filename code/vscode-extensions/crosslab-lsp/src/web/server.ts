import { TextDocument } from "vscode-languageserver-textdocument";
import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createConnection,
  Message,
  TextDocuments,
} from "vscode-languageserver/browser";
import { FileEventMessage } from "./types";

console.log("running server lsp-crosslab");

class LanguageServerProvider {
  private messageReader = new BrowserMessageReader(self);
  private messageWriter = new BrowserMessageWriter(self);
  private uriMapping: Map<string, string> = new Map();
  private readonly uriRegex =
    /(\w(\w|\d|[.+-])*:)(\/\/[^\/?#]*)?(\/[^?#"]+)(\?[^#"]+)?(#[^"]*)?/g;
  private webSocket = new WebSocket("ws://localhost:3010");
  private connection: ReturnType<typeof createConnection>;
  private serverUriPrefix: string = "file://";
  private openPromise: Promise<void>;

  constructor() {
    let resolve: () => void = () => {};
    this.openPromise = new Promise<void>((_resolve) => {
      resolve = _resolve;
    });

    this.registerWebSocketHandlers(resolve);

    this.connection = createConnection(this.messageReader, this.messageWriter, {
      messageStrategy: {
        handleMessage: async (message) => {
          await this.openPromise;
          await this.handleMessage(message);
        },
      },
    });

    // Track open, change and close text document events
    const documents = new TextDocuments(TextDocument);
    documents.listen(this.connection);

    this.connection.listen();
  }

  private registerWebSocketHandlers(resolve: () => void) {
    this.webSocket.onclose = () => {
      console.log(`webSocket connection has been closed`);
    };
    this.webSocket.onerror = (error) => {
      console.error(error);
      console.error(`webSocket: An error has occurred!`);
    };
    this.webSocket.onmessage = (event) => {
      const message = JSON.parse(event.data.toString());

      if (message.type === "path") {
        this.serverUriPrefix = `file://${message.path}`;
        resolve();
        return;
      }

      const data: string = message.data;

      const uris = Array.from(data.match(this.uriRegex) ?? []);
      let mappedMessageString = data;
      for (const uri of uris) {
        const mappedUri = this.uriMapping.get(uri);
        if (!mappedUri) {
          continue;
        }
        mappedMessageString = data.replace(uri, mappedUri);
      }
      const mappedMessage = JSON.parse(mappedMessageString);
      console.log(`incoming:`, mappedMessage);
      this.messageWriter.write(mappedMessage);
    };
    this.webSocket.onopen = () => {
      console.log("webSocket connection has been established!");
    };
  }

  private async handleMessage(message: Message) {
    const messageString = JSON.stringify(message);
    const uris = Array.from(messageString.match(this.uriRegex) ?? []);
    for (const uri of uris) {
      if (!uri.startsWith("file:")) {
        const mappedUri =
          this.serverUriPrefix +
          uri.slice(uri.indexOf(":") + 1).replace(/\/\/[^/]*\//, "/");
        this.uriMapping.set(mappedUri, uri);
        this.uriMapping.set(uri, mappedUri);
      }
    }
    let mappedMessageString = messageString;
    for (const uri of uris) {
      const mappedUri = this.uriMapping.get(uri);
      if (!mappedUri) {
        continue;
      }
      mappedMessageString = messageString.replace(uri, mappedUri);
    }
    console.log("outgoing:", mappedMessageString);
    this.webSocket.send(
      JSON.stringify({ type: "data", data: mappedMessageString })
    );
  }

  public async forwardMessage(message: FileEventMessage) {
    console.log("forwarding:", message);
    await this.openPromise;
    message.path = this.serverUriPrefix.replace("file://", "") + message.path;
    this.webSocket.send(JSON.stringify(message));
  }
}

const languageServerProvider = new LanguageServerProvider();

const originalOnMessage = self.onmessage?.bind(self);
self.onmessage = (message) => {
  console.log("handling:", message.data);
  if ("type" in message.data && message.data.type === "file-event") {
    return languageServerProvider.forwardMessage(message.data);
  }
  originalOnMessage ? originalOnMessage(message) : undefined;
};
