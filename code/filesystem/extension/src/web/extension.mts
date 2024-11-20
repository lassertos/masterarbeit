import * as vscode from "vscode";
import { CrossLabFileSystemProvider } from "./providers/fileSystemProvider.mjs";
import { CrossLabFileSearchProvider } from "./providers/fileSearchProvider.mjs";
import { CrossLabTextSearchProvider } from "./providers/textSearchProvider.mjs";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import { FileSystemService__Producer } from "@crosslab-ide/crosslab-filesystem-service";
import { FileSystemRequestHandler } from "./fileSystemRequestHandler.mjs";
import { ProjectViewDataProvider } from "./providers/projectViewDataProvider.mjs";
import {
  openSettingsDatabase,
  writeSetting,
} from "@crosslab-ide/editor-settings";
import { registerFilesExplorerCopy } from "./filesExplorerActions/copy.mjs";
import { registerFilesExplorerPaste } from "./filesExplorerActions/paste.mjs";
import { registerFilesExplorerCut } from "./filesExplorerActions/cut.mjs";
import { IndexedDBFileSystemProvider } from "./providers/subproviders/indexeddb.mjs";
import { MemoryFileSystemProvider } from "./providers/subproviders/memory.mjs";
import { CrossLabFileSystemSubProvider } from "./providers/subproviders/index.mjs";

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-filesystem-extension" is now active in the web extension host!'
  );

  const fileSystemProvider = new CrossLabFileSystemProvider();
  const projectsProvider = new IndexedDBFileSystemProvider();
  await projectsProvider.initialize();
  fileSystemProvider.addMount("/projects", projectsProvider);
  fileSystemProvider.addMount("/workspace", new MemoryFileSystemProvider());
  await fileSystemProvider.initialize();

  const fileSearchProvider = new CrossLabFileSearchProvider(fileSystemProvider);
  const textSearchProvider = new CrossLabTextSearchProvider(fileSystemProvider);

  const projectViewDataProvider = new ProjectViewDataProvider();
  projectViewDataProvider.addProjectRootFolder(
    "Local Projects",
    vscode.Uri.from({ scheme: "crosslabfs", path: "/projects" })
  );

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
    vscode.commands.registerCommand("projects.view.createProject", async () => {
      const name = await vscode.window.showInputBox({
        prompt: "Please enter a name for your new project!",
        title: "Project Creation",
      });

      if (!name) {
        return;
      }

      const projectUri = vscode.Uri.from({
        scheme: "crosslabfs",
        path: `/projects/${name}`,
      });
      await vscode.workspace.fs.createDirectory(projectUri);
      projectViewDataProvider.refresh();

      const settingsDatabase = await openSettingsDatabase();
      await writeSetting(
        settingsDatabase,
        "crosslab.current-project",
        projectUri.toString()
      );
      await writeSetting(
        settingsDatabase,
        "crosslab.current-project-name",
        name
      );
      fileSystemProvider.setProject(projectUri);
    }),
    vscode.commands.registerCommand(
      "projects.view.openProject",
      async (projectName) => {
        await fileSystemProvider.setProject(projectName);
      }
    ),
    vscode.commands.registerCommand(
      "projects.view.renameProject",
      async (projectName) => {
        const name = await vscode.window.showInputBox({
          prompt: "Please enter a new name for your project!",
          title: "Project Rename",
        });

        if (!name) {
          return;
        }

        const oldProjectUri = vscode.Uri.from({
          scheme: "crosslabfs",
          path: `/projects/${projectName}`,
        });
        const newProjectUri = vscode.Uri.from({
          scheme: "crosslabfs",
          path: `/projects/${name}`,
        });

        await vscode.workspace.fs.rename(oldProjectUri, newProjectUri);

        if (fileSystemProvider.currentProjectUri === projectName) {
          await fileSystemProvider.setProject(newProjectUri);
        }
        projectViewDataProvider.refresh();
      }
    ),
    vscode.commands.registerCommand(
      "projects.view.deleteProject",
      async (projectName) => {
        await vscode.workspace.fs.delete(
          vscode.Uri.from({
            scheme: "crosslabfs",
            path: `/projects/${projectName}`,
          }),
          { recursive: true }
        );
        if (fileSystemProvider.currentProjectUri === projectName) {
          await fileSystemProvider.setProject(null);
        }
        projectViewDataProvider.refresh();
      }
    )
  );

  // create projects and workspace folder
  const projectsUri = vscode.Uri.from({
    scheme: "crosslabfs",
    path: "/projects",
  });

  const workspaceUri = vscode.Uri.from({
    scheme: "crosslabfs",
    path: "/workspace",
  });

  for (const uri of [projectsUri, workspaceUri]) {
    try {
      const folder = await fileSystemProvider.stat(uri);
      if (folder.type !== vscode.FileType.Directory) {
        await fileSystemProvider.delete(uri);
        await fileSystemProvider.createDirectory(uri);
      }
    } catch (error) {
      await fileSystemProvider.createDirectory(uri);
    }
  }

  // create filesystem service producer and its corresponding requestHandler
  const fileSystemServiceProducer = new FileSystemService__Producer(
    "filesystem"
  );
  const fileSystemRequestHandler = new FileSystemRequestHandler();

  fileSystemServiceProducer.on("request", async (consumerId, request) => {
    if (request.type !== "unwatch:request") {
      request.content.path = fileSystemProvider.updateUri(
        vscode.Uri.from({
          scheme: "crosslabfs",
          path: request.content.path,
        })
      ).path;
      if (request.type === "move:request") {
        request.content.newPath = fileSystemProvider.updateUri(
          vscode.Uri.from({
            scheme: "crosslabfs",
            path: request.content.newPath,
          })
        ).path;
      }
    }
    const response = await fileSystemRequestHandler.handleRequest(request);
    await fileSystemServiceProducer.send(consumerId, response);
  });

  vscode.window.createTreeView("projects.view", {
    treeDataProvider: projectViewDataProvider,
  });

  // override the filesExplorer.copy command
  registerFilesExplorerCopy(context, fileSystemProvider);

  // override the filesExplorer.cut command
  registerFilesExplorerCut(context, fileSystemProvider);

  // override the filesExplorer.paste command
  registerFilesExplorerPaste(context, fileSystemProvider);

  vscode.workspace.onDidOpenTextDocument((event) => {
    console.log("filesystem-extension: opened text document", event.uri.path);
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    console.log(
      "filesystem-extension: changed text document",
      event.document.uri.path
    );
  });

  vscode.workspace.onDidCloseTextDocument((event) => {
    console.log("filesystem-extension: closed text document", event.uri.path);
  });

  return {
    addServices: (deviceHandler: DeviceHandler) => {
      console.log("adding filesystem service producer!");
      deviceHandler.addService(fileSystemServiceProducer);
      console.log("added filesystem service producer!");
    },
    onProjectChanged: (
      handler: (project: vscode.Uri) => Promise<void> | void
    ) => {
      fileSystemProvider.addProjectChangedHandler(handler);
    },
    getCurrentProject: (): vscode.Uri => {
      return vscode.Uri.from({
        scheme: "crosslabfs",
        path: fileSystemProvider.currentProjectUri
          ? fileSystemProvider.currentProjectUri.path
          : "/workspace",
      });
    },
    addMount: async (path: string, type: "indexeddb" | "memory") => {
      const provider: CrossLabFileSystemSubProvider =
        type === "indexeddb"
          ? new IndexedDBFileSystemProvider()
          : new MemoryFileSystemProvider();
      fileSystemProvider.addMount(path, provider);
      if (provider.initialize) {
        await provider?.initialize();
      }
    },
    addProjectRootFolder: (title: string, uri: vscode.Uri) => {
      projectViewDataProvider.addProjectRootFolder(title, uri);
    },
    refreshProjectsView: () => {
      projectViewDataProvider.refresh();
    },
  };
}
