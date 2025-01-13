import { FileSystemProtocol } from "@crosslab-ide/crosslab-filesystem-service";
import {
  IncomingMessage,
  ProtocolMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import vscode from "vscode";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Directory } from "@crosslab-ide/filesystem-schemas";

const requestResponseMapping = {
  "createDirectory:request": "createDirectory:response",
  "delete:request": "delete:response",
  "move:request": "move:response",
  "readDirectory:request": "readDirectory:response",
  "readFile:request": "readFile:response",
  "unwatch:request": "unwatch:response",
  "watch:request": "watch:response",
  "writeFile:request": "writeFile:response",
} as const;

export class FileSystemRequestHandler {
  private _fileSystemWatchers = new Map<string, vscode.Disposable>();

  async handleRequest(
    request: IncomingMessage<FileSystemProtocol, "producer">
  ): Promise<
    ProtocolMessage<
      FileSystemProtocol,
      (typeof requestResponseMapping)[typeof request.type]
    >
  > {
    try {
      switch (request.type) {
        case "createDirectory:request":
          return await this._handleCreateDirectoryRequest(request);
        case "delete:request":
          return await this._handleDeleteRequest(request);
        case "move:request":
          return await this._handleMoveRequest(request);
        case "readDirectory:request":
          return await this._handleReadDirectoryRequest(request);
        case "readFile:request":
          return await this._handleReadFileRequest(request);
        case "unwatch:request":
          return await this._handleUnwatchRequest(request);
        case "watch:request":
          return await this._handleWatchRequest(request);
        case "writeFile:request":
          return await this._handleWriteFileRequest(request);
      }
    } catch (error) {
      return {
        type: requestResponseMapping[request.type],
        content: {
          requestId: request.content.requestId,
          success: false,
          message: error instanceof Error ? error.message : undefined,
        },
      };
    }
  }

  private async _handleCreateDirectoryRequest(
    request: ProtocolMessage<FileSystemProtocol, "createDirectory:request">
  ): Promise<ProtocolMessage<FileSystemProtocol, "createDirectory:response">> {
    await vscode.workspace.fs.createDirectory(
      vscode.Uri.from({
        scheme: "crosslabfs",
        path: request.content.path,
      })
    );

    return {
      type: "createDirectory:response",
      content: {
        requestId: request.content.requestId,
        success: true,
      },
    };
  }

  private async _handleDeleteRequest(
    request: ProtocolMessage<FileSystemProtocol, "delete:request">
  ): Promise<ProtocolMessage<FileSystemProtocol, "delete:response">> {
    await vscode.workspace.fs.delete(
      vscode.Uri.from({
        scheme: "crosslabfs",
        path: request.content.path,
      })
    );

    return {
      type: "delete:response",
      content: {
        requestId: request.content.requestId,
        success: true,
      },
    };
  }

  private async _handleMoveRequest(
    request: ProtocolMessage<FileSystemProtocol, "move:request">
  ): Promise<ProtocolMessage<FileSystemProtocol, "move:response">> {
    await vscode.workspace.fs.rename(
      vscode.Uri.from({
        scheme: "crosslabfs",
        path: request.content.path,
      }),
      vscode.Uri.from({
        scheme: "crosslabfs",
        path: request.content.newPath,
      })
    );

    return {
      type: "move:response",
      content: {
        requestId: request.content.requestId,
        success: true,
      },
    };
  }

  private async _handleReadDirectoryRequest(
    request: ProtocolMessage<FileSystemProtocol, "readDirectory:request">
  ): Promise<ProtocolMessage<FileSystemProtocol, "readDirectory:response">> {
    const directory = await this._readDirectory(request.content.path);

    return {
      type: "readDirectory:response",
      content: {
        requestId: request.content.requestId,
        success: true,
        directory,
      },
    };
  }

  private async _handleReadFileRequest(
    request: ProtocolMessage<FileSystemProtocol, "readFile:request">
  ): Promise<ProtocolMessage<FileSystemProtocol, "readFile:response">> {
    const content = await vscode.workspace.fs.readFile(
      vscode.Uri.from({
        scheme: "crosslabfs",
        path: request.content.path,
      })
    );

    return {
      type: "readFile:response",
      content: {
        requestId: request.content.requestId,
        success: true,
        file: {
          name: path.basename(request.content.path),
          type: "file",
          content: content,
        },
      },
    };
  }

  private async _handleUnwatchRequest(
    request: ProtocolMessage<FileSystemProtocol, "unwatch:request">
  ): Promise<ProtocolMessage<FileSystemProtocol, "unwatch:response">> {
    this._fileSystemWatchers.get(request.content.watcherId)?.dispose();
    this._fileSystemWatchers.delete(request.content.watcherId);

    return {
      type: "unwatch:response",
      content: {
        requestId: request.content.requestId,
        success: true,
      },
    };
  }

  private async _handleWatchRequest(
    request: ProtocolMessage<FileSystemProtocol, "watch:request">
  ): Promise<ProtocolMessage<FileSystemProtocol, "watch:response">> {
    const watcherId = uuidv4();
    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.Uri.from({
          scheme: "crosslabfs",
          path: request.content.path,
        }),
        "*"
      )
    );
    this._fileSystemWatchers.set(watcherId, fileSystemWatcher);

    // TODO: handle filesystem events

    return {
      type: "watch:response",
      content: {
        requestId: request.content.requestId,
        success: true,
        watcherId,
      },
    };
  }

  private async _handleWriteFileRequest(
    request: ProtocolMessage<FileSystemProtocol, "writeFile:request">
  ): Promise<ProtocolMessage<FileSystemProtocol, "writeFile:response">> {
    await vscode.workspace.fs.writeFile(
      vscode.Uri.from({
        scheme: "crosslabfs",
        path: request.content.path,
      }),
      Buffer.from(request.content.content)
    );

    return {
      type: "writeFile:response",
      content: { requestId: request.content.requestId, success: true },
    };
  }

  private async _readDirectory(directoryPath: string): Promise<Directory> {
    const uri = vscode.Uri.from({ scheme: "crosslabfs", path: directoryPath });
    const directory: Directory = {
      name: path.basename(directoryPath),
      type: "directory",
      content: {},
    };
    const entries = await vscode.workspace.fs.readDirectory(uri);

    for (const entry of entries) {
      switch (entry[1]) {
        case vscode.FileType.Unknown:
          break;
        case vscode.FileType.File:
          directory.content[entry[0]] = {
            type: "file",
            content: await vscode.workspace.fs.readFile(
              vscode.Uri.joinPath(uri, entry[0])
            ),
          };
          break;
        case vscode.FileType.Directory:
          directory.content[entry[0]] = await this._readDirectory(
            path.join(directoryPath, entry[0])
          );
          break;
        case vscode.FileType.SymbolicLink:
          break;
      }
    }

    return directory;
  }
}
