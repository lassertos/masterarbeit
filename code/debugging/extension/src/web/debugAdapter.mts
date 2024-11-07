import vscode, { DebugProtocolMessage } from "vscode";
import { DebuggingAdapterServiceConsumer } from "@crosslab-ide/crosslab-debugging-adapter-service";
import { checkDirectory, reviveDirectory } from "./util.mjs";

export class DebugAdapter implements vscode.DebugAdapter {
  private _didSendMessageEmitter: vscode.EventEmitter<vscode.DebugProtocolMessage> =
    new vscode.EventEmitter<DebugProtocolMessage>();

  constructor(
    readonly session: vscode.DebugSession,
    readonly context: vscode.ExtensionContext,
    private readonly _debuggingAdapterServiceConsumer: DebuggingAdapterServiceConsumer
  ) {
    this._debuggingAdapterServiceConsumer.on("message", (message) => {
      console.log("received debug adapter message:", message);
      if (
        message.type === "message:dap" &&
        message.content.sessionId === session.configuration.sessionId
      ) {
        console.log("received debug adapter protocol message:", message);
        this._didSendMessageEmitter.fire(message.content.message);
      }
    });
  }

  onDidSendMessage: vscode.Event<vscode.DebugProtocolMessage> =
    this._didSendMessageEmitter.event;

  handleMessage(message: vscode.DebugProtocolMessage): void {
    this._debuggingAdapterServiceConsumer
      .send({
        type: "message:dap",
        content: {
          sessionId: this.session.configuration.sessionId,
          message: { ...message },
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
