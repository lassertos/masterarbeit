import { DebuggingAdapterServiceConsumer } from "@crosslab-ide/crosslab-debugging-adapter-service";
import { Directory } from "@crosslab-ide/filesystem-schemas";
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
    _folder: vscode.WorkspaceFolder | undefined,
    _token?: vscode.CancellationToken
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
    _token?: vscode.CancellationToken
  ): Promise<vscode.DebugConfiguration> {
    console.log("debugging: resolving debug configuration");

    const debuggingSessionInfo = debugConfiguration.sessionId
      ? await this._debuggingAdapterServiceConsumer.joinSession(
          debugConfiguration.producerId,
          debugConfiguration.sessionId
        )
      : await this._debuggingAdapterServiceConsumer.startSession(
          debugConfiguration.producerId,
          {
            directory: await this._readDirectory(folder),
            configuration: debugConfiguration,
          }
        );

    const resolvedDebugConfiguration = {
      ...debugConfiguration,
      ...debuggingSessionInfo.configuration,
      sessionId: debuggingSessionInfo.sessionId,
    };

    console.log(
      "debugging: resolved debug configuration",
      resolvedDebugConfiguration
    );

    return resolvedDebugConfiguration;
  }

  resolveDebugConfigurationWithSubstitutedVariables(
    _folder: vscode.WorkspaceFolder | undefined,
    debugConfiguration: vscode.DebugConfiguration,
    _token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    return debugConfiguration;
  }
}
