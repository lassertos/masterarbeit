import * as vscode from "vscode";
import { CrossLabFileSystemProvider } from "./providers/fileSystemProvider.mjs";
import { CrossLabFileSearchProvider } from "./providers/fileSearchProvider.mjs";
import { CrossLabTextSearchProvider } from "./providers/textSearchProvider.mjs";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import { FileSystemService__Producer } from "@crosslab-ide/crosslab-filesystem-service";
import { v4 as uuidv4 } from "uuid";
import { Directory } from "@crosslab-ide/filesystem-messaging-protocol";
import path from "path";

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-filesystem-extension" is now active in the web extension host!'
  );

  const fileSystemProvider = new CrossLabFileSystemProvider();
  await fileSystemProvider.initialize();

  const fileSearchProvider = new CrossLabFileSearchProvider(fileSystemProvider);
  const textSearchProvider = new CrossLabTextSearchProvider(fileSystemProvider);

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider(
      "crosslabfs",
      fileSystemProvider,
      {
        isCaseSensitive: true,
      }
    )
  );

  context.subscriptions.push(
    vscode.workspace.registerFileSearchProvider(
      "crosslabfs",
      fileSearchProvider
    )
  );

  context.subscriptions.push(
    vscode.workspace.registerTextSearchProvider(
      "crosslabfs",
      textSearchProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "crosslab-filesystem-extension.workspaceInit",
      async (_) => {
        const directory = await vscode.window.showQuickPick(
          fileSystemProvider.getAllDirectoryPaths()
        );
        await vscode.commands.executeCommand(
          "vscode.openFolder",
          vscode.Uri.parse(`file:${directory}`)
        );
        // vscode.workspace.updateWorkspaceFolders(0, 0, {
        //   uri: vscode.Uri.parse(`file:${directory}`),
        //   name: directory?.slice(directory.lastIndexOf("/") + 1),
        // });
      }
    )
  );

  const projectsUri = vscode.Uri.from({
    scheme: "crosslabfs",
    path: "/projects",
  });

  try {
    const projectsFolder = await fileSystemProvider.stat(projectsUri);
    if (projectsFolder.type !== vscode.FileType.Directory) {
      await fileSystemProvider.delete(projectsUri);
      await fileSystemProvider.createDirectory(projectsUri);
    }
  } catch (error) {
    await fileSystemProvider.createDirectory(projectsUri);
  }

  const readDirectory = async (
    directoryPath: string
  ): Promise<Directory["content"]> => {
    const uri = vscode.Uri.from({ scheme: "crosslabfs", path: directoryPath });
    const content: Directory["content"] = [];
    const entries = await fileSystemProvider.readDirectory(uri);

    for (const entry of entries) {
      switch (entry[1]) {
        case vscode.FileType.Unknown:
          break;
        case vscode.FileType.File:
          content.push({
            type: "file",
            name: entry[0],
            content: new TextDecoder().decode(
              await fileSystemProvider.readFile(
                vscode.Uri.joinPath(uri, entry[0])
              )
            ),
          });
          break;
        case vscode.FileType.Directory:
          content.push({
            type: "directory",
            name: entry[0],
            content: await readDirectory(path.join(directoryPath, entry[0])),
          });
          break;
        case vscode.FileType.SymbolicLink:
          break;
      }
    }

    return content;
  };

  const fileSystemServiceProducer = new FileSystemService__Producer(
    "filesystem"
  );
  const fileSystemWatchers = new Map<string, vscode.Disposable>();

  fileSystemServiceProducer.on("request", async (request) => {
    console.log("received request", request);
    switch (request.type) {
      case "createDirectory:request":
        try {
          await fileSystemProvider.createDirectory(
            vscode.Uri.from({
              scheme: "crosslabfs",
              path: request.content.path,
            })
          );
          await fileSystemServiceProducer.send({
            type: "createDirectory:response",
            content: {
              requestId: request.content.requestId,
              success: true,
            },
          });
        } catch (error) {
          await fileSystemServiceProducer.send({
            type: "createDirectory:response",
            content: {
              requestId: request.content.requestId,
              success: false,
              message: error instanceof Error ? error.message : undefined,
            },
          });
        }
        break;
      case "delete:request":
        try {
          await fileSystemProvider.delete(
            vscode.Uri.from({
              scheme: "crosslabfs",
              path: request.content.path,
            })
          );
          await fileSystemServiceProducer.send({
            type: "delete:response",
            content: {
              requestId: request.content.requestId,
              success: true,
            },
          });
        } catch (error) {
          await fileSystemServiceProducer.send({
            type: "delete:response",
            content: {
              requestId: request.content.requestId,
              success: false,
              message: error instanceof Error ? error.message : undefined,
            },
          });
        }
        break;
      case "move:request":
        try {
          await fileSystemProvider.rename(
            vscode.Uri.from({
              scheme: "crosslabfs",
              path: request.content.path,
            }),
            vscode.Uri.from({
              scheme: "crosslabfs",
              path: request.content.newPath,
            })
          );
          await fileSystemServiceProducer.send({
            type: "move:response",
            content: {
              requestId: request.content.requestId,
              success: true,
            },
          });
        } catch (error) {
          await fileSystemServiceProducer.send({
            type: "move:response",
            content: {
              requestId: request.content.requestId,
              success: false,
              message: error instanceof Error ? error.message : undefined,
            },
          });
        }
        break;
      case "readDirectory:request":
        try {
          const content = await readDirectory(request.content.path);
          await fileSystemServiceProducer.send({
            type: "readDirectory:response",
            content: {
              requestId: request.content.requestId,
              success: true,
              content,
            },
          });
        } catch (error) {
          await fileSystemServiceProducer.send({
            type: "readDirectory:response",
            content: {
              requestId: request.content.requestId,
              success: false,
              message: error instanceof Error ? error.message : undefined,
            },
          });
        }
        break;
      case "readFile:request":
        try {
          const content = await fileSystemProvider.readFile(
            vscode.Uri.from({
              scheme: "crosslabfs",
              path: request.content.path,
            })
          );
          await fileSystemServiceProducer.send({
            type: "readFile:response",
            content: {
              requestId: request.content.requestId,
              success: true,
              content: new TextDecoder().decode(content),
            },
          });
        } catch (error) {
          await fileSystemServiceProducer.send({
            type: "readFile:response",
            content: {
              requestId: request.content.requestId,
              success: false,
              message: error instanceof Error ? error.message : undefined,
            },
          });
        }
        break;
      case "unwatch:request":
        fileSystemWatchers.get(request.content.watcherId)?.dispose();
        fileSystemWatchers.delete(request.content.watcherId);
        await fileSystemServiceProducer.send({
          type: "unwatch:response",
          content: {
            requestId: request.content.requestId,
            success: true,
          },
        });
        break;
      case "watch:request":
        try {
          const watcherId = uuidv4();
          const fileSystemWatcher = fileSystemProvider.watch(
            vscode.Uri.from({
              scheme: "crosslabfs",
              path: request.content.path,
            }),
            { recursive: true, excludes: [] }
          );
          fileSystemWatchers.set(watcherId, fileSystemWatcher);
          await fileSystemServiceProducer.send({
            type: "watch:response",
            content: {
              requestId: request.content.requestId,
              success: true,
              watcherId,
            },
          });
        } catch (error) {
          await fileSystemServiceProducer.send({
            type: "watch:response",
            content: {
              requestId: request.content.requestId,
              success: false,
              message: error instanceof Error ? error.message : undefined,
            },
          });
        }
        break;
      case "writeFile:request":
        try {
          await fileSystemProvider.writeFile(
            vscode.Uri.from({
              scheme: "crosslabfs",
              path: request.content.path,
            }),
            Buffer.from(request.content.content)
          );
          await fileSystemServiceProducer.send({
            type: "writeFile:response",
            content: { requestId: request.content.requestId, success: true },
          });
        } catch (error) {
          await fileSystemServiceProducer.send({
            type: "writeFile:response",
            content: {
              requestId: request.content.requestId,
              success: false,
              message: error instanceof Error ? error.message : undefined,
            },
          });
        }
        break;
    }
  });

  return {
    addServices: (deviceHandler: DeviceHandler) => {
      console.log("adding filesystem service producer!");
      deviceHandler.addService(fileSystemServiceProducer);
      console.log("added filesystem service producer!");
    },
  };
}
