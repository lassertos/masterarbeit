import vscode from "vscode";
import { DebugAdapter } from "./debugAdapter.mjs";
import { DebuggingServiceConsumer } from "@crosslab-ide/crosslab-debugging-service";

export class DebugAdapterDescriptorFactory
  implements vscode.DebugAdapterDescriptorFactory
{
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly debuggingServiceConsumer: DebuggingServiceConsumer
  ) {}

  createDebugAdapterDescriptor(
    session: vscode.DebugSession
  ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    return new vscode.DebugAdapterInlineImplementation(
      new DebugAdapter(session, this.context, this.debuggingServiceConsumer)
    );
  }
}
