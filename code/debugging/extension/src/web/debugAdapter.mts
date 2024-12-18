import vscode, { DebugProtocolMessage } from "vscode";
import {
  DebuggingAdapterServiceConsumer,
  isDebugAdapterProtocolType,
} from "@crosslab-ide/crosslab-debugging-adapter-service";

export class DebugAdapter implements vscode.DebugAdapter {
  private _didSendMessageEmitter: vscode.EventEmitter<vscode.DebugProtocolMessage> =
    new vscode.EventEmitter<DebugProtocolMessage>();
  private _producerId: string;

  constructor(
    readonly session: vscode.DebugSession,
    readonly context: vscode.ExtensionContext,
    private readonly _debuggingAdapterServiceConsumer: DebuggingAdapterServiceConsumer
  ) {
    this._producerId = session.configuration.producerId;
    this._debuggingAdapterServiceConsumer.on(
      "message",
      (producerId, message) => {
        console.log("received debug adapter message:", message);
        if (
          producerId === this._producerId &&
          message.type === "message:dap" &&
          message.content.sessionId === session.configuration.sessionId
        ) {
          console.log("received debug adapter protocol message:", message);
          this._didSendMessageEmitter.fire(message.content.message);
        }
      }
    );
  }

  onDidSendMessage: vscode.Event<vscode.DebugProtocolMessage> =
    this._didSendMessageEmitter.event;

  handleMessage(message: vscode.DebugProtocolMessage): void {
    if (!isDebugAdapterProtocolType("ProtocolMessage", message)) {
      throw new Error(`Message is not a valid debug adapter protocol message!`);
    }
    if (
      isDebugAdapterProtocolType("SourceRequest", message) &&
      message.arguments.source
    ) {
      message.arguments.source.path = message.arguments.source.path?.replace(
        /\\/g,
        "/"
      );
    }
    this._debuggingAdapterServiceConsumer
      .send(this._producerId, {
        type: "message:dap",
        content: {
          sessionId: this.session.configuration.sessionId,
          message,
        },
      })
      .catch((error) => {
        console.error(error);
      });
  }

  dispose() {
    // TODO
  }
}
