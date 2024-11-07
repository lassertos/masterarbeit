import {
  DebuggingAdapterServiceConsumer,
  Directory,
} from "@crosslab-ide/crosslab-debugging-adapter-service";
import vscode from "vscode";

export class DebugConfigurationProvider
  implements vscode.DebugConfigurationProvider
{
  private _debuggingAdapterServiceConsumer: DebuggingAdapterServiceConsumer;
  private _readDirectory: (
    workspaceFolder: vscode.WorkspaceFolder | undefined
  ) => Promise<Directory> | Directory;

  constructor(
    debuggingAdapterServiceConsumer: DebuggingAdapterServiceConsumer,
    readDirectory: (
      workspaceFolder: vscode.WorkspaceFolder | undefined
    ) => Promise<Directory> | Directory
  ) {
    this._debuggingAdapterServiceConsumer = debuggingAdapterServiceConsumer;
    this._readDirectory = readDirectory;
  }

  provideDebugConfigurations(
    folder: vscode.WorkspaceFolder | undefined,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration[]> {
    return [
      {
        name: "Debug CrossLab",
        type: "crosslab",
        request: "launch",
      },
    ];
  }

  async resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    debugConfiguration: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): Promise<vscode.DebugConfiguration> {
    const directory = await this._readDirectory(folder);

    const debuggingSessionInfo =
      await this._debuggingAdapterServiceConsumer.startSession({
        directory,
        configuration: debugConfiguration,
      });

    return {
      ...debugConfiguration,
      ...debuggingSessionInfo.configuration,
      sessionId: debuggingSessionInfo.sessionId,
    };
  }

  resolveDebugConfigurationWithSubstitutedVariables(
    folder: vscode.WorkspaceFolder | undefined,
    debugConfiguration: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    return debugConfiguration;
  }
}
