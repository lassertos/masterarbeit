import vscode, { DebugProtocolMessage } from "vscode";
import { DebuggingServiceConsumer } from "@crosslab-ide/crosslab-debugging-service";

export class DebugAdapter implements vscode.DebugAdapter {
  private _didSendMessageEmitter: vscode.EventEmitter<vscode.DebugProtocolMessage> =
    new vscode.EventEmitter<DebugProtocolMessage>();

  constructor(
    readonly session: vscode.DebugSession,
    readonly context: vscode.ExtensionContext,
    private readonly _debuggingServiceConsumer: DebuggingServiceConsumer
  ) {
    this._debuggingServiceConsumer.on("message", (message) => {
      this._didSendMessageEmitter.fire({ ...message.content });
    });
    this._debuggingServiceConsumer.startSession(session, session.configuration);
  }

  onDidSendMessage: vscode.Event<vscode.DebugProtocolMessage> =
    this._didSendMessageEmitter.event;

  handleMessage(message: vscode.DebugProtocolMessage): void {
    this._debuggingServiceConsumer
      .send({
        type: "debug-adapter-protocol",
        content: message,
      })
      .catch((error) => {
        console.error(error);
      });
  }

  dispose() {
    // TODO
  }
}
