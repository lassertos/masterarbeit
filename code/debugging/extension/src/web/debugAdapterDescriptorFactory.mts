import vscode from "vscode";
import { DebugAdapter } from "./debugAdapter.mjs";
import { DebuggingAdapterServiceConsumer } from "@crosslab-ide/crosslab-debugging-adapter-service";

export class DebugAdapterDescriptorFactory
  implements vscode.DebugAdapterDescriptorFactory
{
  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly _debuggingAdapterServiceConsumer: DebuggingAdapterServiceConsumer
  ) {}

  createDebugAdapterDescriptor(
    session: vscode.DebugSession
  ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    const debugAdapter = new DebugAdapter(
      session,
      this._context,
      this._debuggingAdapterServiceConsumer
    );
    debugAdapter.onDidSendMessage((message) => {
      console.log("debug adapter did send message:", message);
    });
    return new vscode.DebugAdapterInlineImplementation(debugAdapter);
  }
}
