import * as vscode from "vscode";
import path from "path";
import {
  CollaborationObject,
  CollaborationServiceProsumer,
  CollaborationString,
  CollaborationUpdateEventType,
} from "@crosslab-ide/crosslab-collaboration-service";
import {
  File,
  Directory,
  DirectoryWithoutName,
  FileWithoutName,
  isDirectoryWithoutName,
  isFileWithoutName,
} from "./types.mjs";
import { Mutex } from "async-mutex";

export class ProjectsBinding {
  private _mutex: Mutex = new Mutex();
  private _sharedProjects: Set<vscode.Uri> = new Set();
  private _fileSystemApi: {
    getCurrentProject: () => vscode.Uri;
    refreshProjectsView: () => void;
    addProjectRootFolder: (title: string, uri: vscode.Uri) => void;
    removeProjectRootFolder: (title: string) => void;
  } = {
    getCurrentProject: () => vscode.Uri.from({ scheme: "crosslabfs" }),
    refreshProjectsView: () => undefined,
    addProjectRootFolder: (title: string, uri: vscode.Uri) => undefined,
    removeProjectRootFolder: (title: string) => undefined,
  };

  private _remoteChanges: (
    | { index: number; insert: string }
    | { index: number; delete: number }
  )[] = [];

  constructor(
    private _collaborationServiceProsumer: CollaborationServiceProsumer
  ) {
    // check for required extensions and their apis
    const fileSystemExtension = vscode.extensions.getExtension(
      "crosslab.@crosslab-ide/crosslab-filesystem-extension"
    );

    if (!fileSystemExtension) {
      throw new Error(
        "This extension requires the extension 'crosslab.@crosslab-ide/crosslab-filesystem-extension'!"
      );
    }

    if (fileSystemExtension.isActive) {
      this._fileSystemApi = fileSystemExtension.exports;
    } else {
      fileSystemExtension.activate().then((exports) => {
        this._fileSystemApi = exports;
      });
    }

    vscode.workspace.onDidChangeTextDocument(async (event) => {
      const changes = event.contentChanges.map((contentChange) => {
        const index = contentChange.rangeOffset;

        if (!contentChange.text) {
          return {
            index,
            delete: contentChange.rangeLength,
          };
        }

        return {
          index,
          insert: contentChange.text,
        };
      });
      console.log(
        "collaboration: text document changed",
        event,
        changes,
        this._remoteChanges
      );

      const remainingChanges: vscode.TextDocumentContentChangeEvent[] = [];

      for (const [index, change] of changes.entries()) {
        const yjsChangeIndex = this._remoteChanges.findIndex(
          (yjsChange) =>
            change.index === yjsChange.index &&
            ("delete" in yjsChange
              ? change.delete === yjsChange.delete
              : change.insert === yjsChange.insert)
        );
        if (yjsChangeIndex >= 0) {
          console.log(
            "collaboration: found yjsChange for change",
            yjsChangeIndex,
            change,
            this._remoteChanges[yjsChangeIndex]
          );

          this._remoteChanges.splice(yjsChangeIndex, 1);

          console.log("collaboration: updated yjsChanges", this._remoteChanges);
        } else {
          remainingChanges.push(event.contentChanges[index]);
        }
      }

      console.log("collaboration: remaining changes", remainingChanges);

      if (remainingChanges.length === 0) {
        return;
      }

      console.log(
        "collaboration: text document changed (path updated)",
        event.document.uri.with({
          path: event.document.uri.path.startsWith("/workspace/")
            ? event.document.uri.path.replace(
                "/workspace",
                this._fileSystemApi.getCurrentProject().path
              )
            : event.document.uri.path,
        })
      );
      const updatedPath = event.document.uri.path.startsWith("/workspace/")
        ? event.document.uri.path.replace(
            "/workspace",
            this._fileSystemApi.getCurrentProject().path
          )
        : event.document.uri.path;

      console.log("collaboration: updated path", updatedPath);

      // TOOD: get value corresponding to correct shared project
      const collaborationString = updatedPath.startsWith("/projects/")
        ? updatedPath
            .replace("/projects/", "")
            .split("/")
            .flatMap((pathSegment) => [pathSegment, "content"])
            .reduce((accumulator, currentValue) => {
              console.log(
                "collaboration: current value accumulator",
                accumulator,
                currentValue
              );
              if (!(accumulator instanceof CollaborationObject)) {
                throw new Error("collaboration: expected map!");
              }
              return accumulator.get(currentValue) as CollaborationObject;
            }, this._getValue())
        : updatedPath
            .replace("/shared/", "")
            .split("/")
            .slice(1)
            .flatMap((pathSegment) => [pathSegment, "content"])
            .reduce((accumulator, currentValue) => {
              console.log(
                "collaboration: current value accumulator",
                accumulator,
                currentValue
              );
              if (!(accumulator instanceof CollaborationObject)) {
                throw new Error(
                  "collaboration: expected collaboration object!"
                );
              }
              return accumulator.get(currentValue) as CollaborationObject;
            }, this._getValue(updatedPath.replace("/shared/", "").split("/").at(0)));

      console.log("collaboration: collaboration string", collaborationString);

      if (!(collaborationString instanceof CollaborationString)) {
        throw new Error("collaboration: expected collaboration string!");
      }

      if (
        event.document.getText() ===
        (collaborationString as CollaborationString).toJSON()
      ) {
        return;
      }

      this._collaborationServiceProsumer.executeTransaction(
        "projects",
        () => {
          console.log("collaboration: before", collaborationString.toJSON());
          remainingChanges
            .sort(
              (change1, change2) => change2.rangeOffset - change1.rangeOffset
            )
            .forEach((change) => {
              collaborationString.delete(
                change.rangeOffset,
                change.rangeLength
              );
              collaborationString.insert(change.rangeOffset, change.text);
            });
          console.log("collaboration: after", collaborationString.toJSON());
        },
        this
      );
    }, this);

    // TODO: this should be done over the collaboration ui
    this.shareProject(
      vscode.Uri.from({
        scheme: "crosslabfs",
        path: "/projects/collaboration-test",
      })
    );
  }

  private _getValue(key: string = this._collaborationServiceProsumer.id) {
    const projectsCollaborationObject =
      this._collaborationServiceProsumer.getCollaborationValue(
        "projects",
        "projects",
        "object"
      );

    if (!(projectsCollaborationObject instanceof CollaborationObject)) {
      throw new Error(`Expected projects to be a collaboration object!`);
    }

    console.log(
      "collaboration: projects collaboration object",
      projectsCollaborationObject
    );

    const collaborationObject = projectsCollaborationObject.get(key);

    if (!(collaborationObject instanceof CollaborationObject)) {
      throw new Error(
        `Expected property "${key}" of projects to be a collaboration object!`
      );
    }

    return collaborationObject;
  }

  shareProject(projectUri: vscode.Uri) {
    this._sharedProjects.add(projectUri);
    if (!projectUri.path.startsWith("/projects/")) {
      throw new Error(
        `Cannot share "${projectUri.path}" since it is not a local project!`
      );
    }

    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(projectUri, "**/*")
    );

    fileSystemWatcher.onDidChange((uri) =>
      this._handleFilesystemChangedEvent(uri)
    );

    fileSystemWatcher.onDidCreate((uri) =>
      this._handleFilesystemCreatedEvent(uri)
    );

    fileSystemWatcher.onDidDelete((uri) =>
      this._handleFilesystemDeletedEvent(uri)
    );
  }

  async getSharedProjects() {
    const sharedProjects: Record<string, Directory> = {};
    for (const uri of this._sharedProjects) {
      sharedProjects[path.basename(uri.path)] = await this._readDirectory(uri);
    }
    return sharedProjects;
  }

  async handleCollaborationEvent(
    events: CollaborationUpdateEventType[],
    localId: string
  ) {
    console.log("collaboration: handling events", events);

    for (const event of events) {
      if (event.origin === this) {
        return;
      }
      this._handleEvent(event, localId);
    }
  }

  private async _handleEvent(
    event: CollaborationUpdateEventType,
    localId: string
  ) {
    // TODO: needed?
    console.log(
      "collaboration: handling event",
      `/${event.path.join("/")}`,
      event.target instanceof CollaborationObject,
      Array.from(
        (event as CollaborationUpdateEventType<"object">).changes.entries()
      )
    );
    if (`/${event.path.join("/")}` === `/projects`) {
      if (event.target instanceof CollaborationObject) {
        for (const [key, value] of (
          event as CollaborationUpdateEventType<"object">
        ).changes.entries()) {
          const sharedProjectsUri = vscode.Uri.from({
            scheme: "crosslabfs",
            path: `/shared/${key}`,
          });
          if (value.action === "add") {
            const directory = {
              type: "directory",
              content: event.target.get(key)?.toJSON(),
            };
            console.log(
              "collaboration: directory",
              directory,
              isDirectoryWithoutName(directory)
            );
            if (!isDirectoryWithoutName(directory)) {
              return;
            }
            await this._createDirectory(sharedProjectsUri, directory);
            this._fileSystemApi.addProjectRootFolder(
              `Shared projects: ${key}`,
              sharedProjectsUri
            );
          } else if (value.action === "delete") {
            await vscode.workspace.fs.delete(sharedProjectsUri, {
              recursive: true,
            });
            this._fileSystemApi.removeProjectRootFolder(
              `Shared projects: ${key}`
            );
          }
        }
      }
      return;
    }

    // get changed id
    const id = event.path.at(1);

    if (!id) {
      throw new Error(
        `Path "${`/${event.path.join(
          "/"
        )}`}" is not formated as expected! (expected: "/projects/{id}/...")`
      );
    }

    if (typeof id !== "string") {
      throw new Error(`Expected id to be of type "string", got "${typeof id}"`);
    }

    // check that path is valid
    const eventPath = event.path.slice(2);
    const filteredEventPath = eventPath.filter(
      (pathSegment) => typeof pathSegment !== "number"
    );

    if (filteredEventPath.length !== eventPath.length) {
      throw new Error("collaboration: did not expect number in path");
    }

    const pathSegments =
      id !== localId
        ? [
            "/shared",
            id,
            ...filteredEventPath.filter((_, index) => index % 2 === 0),
          ]
        : [
            "/projects",
            ...filteredEventPath.filter((_, index) => index % 2 === 0),
          ];

    console.log("collaboration: path", event.path, pathSegments);

    // map event path to filesystem uri
    const uri = vscode.Uri.from({
      scheme: "crosslabfs",
      path: path.join(...pathSegments),
    });

    // get type of changed entry
    const type = (await vscode.workspace.fs.stat(uri)).type;

    // apply changes
    switch (type) {
      case vscode.FileType.Unknown:
        break;
      case vscode.FileType.File:
        // apply file changes
        if (!(event.target instanceof CollaborationString)) {
          throw new Error(`Event target is not a collaboration string!`);
        }
        await this._handleFileEvents(
          event as CollaborationUpdateEventType<"string">,
          uri
        );
        break;
      case vscode.FileType.Directory:
        if (!(event.target instanceof CollaborationObject)) {
          throw new Error(`Event target is not a collaboration object!`);
        }
        await this._handleDirectoryEvent(
          event as CollaborationUpdateEventType<"object">,
          uri
        );
        break;
      case vscode.FileType.SymbolicLink:
        break;
    }
  }

  private async _handleFileEvents(
    event: CollaborationUpdateEventType<"string">,
    uri: vscode.Uri
  ) {
    // TODO: update uri correctly
    const textEditor = vscode.window.visibleTextEditors.find(
      (visibleTextEditor) =>
        visibleTextEditor.document.uri.scheme === uri.scheme &&
        visibleTextEditor.document.uri.path ===
          (uri.path.startsWith(this._fileSystemApi.getCurrentProject().path)
            ? uri.path.replace(
                this._fileSystemApi.getCurrentProject().path,
                "/workspace"
              )
            : uri.path)
    );

    console.log(
      "collaboration: collaboration-event file update",
      event,
      uri,
      textEditor
    );

    if (textEditor) {
      const release = await this._mutex.acquire();
      try {
        let index = 0;
        await textEditor.edit((builder) => {
          const document = textEditor.document;
          event.changes.forEach((op) => {
            if (op.retain !== undefined) {
              index += op.retain;
            } else if (op.insert !== undefined) {
              const pos = document.positionAt(index);
              console.log(index, pos);
              const insert = op.insert as string;
              builder.insert(pos, insert);
              this._remoteChanges.push({ index, insert });
            } else if (op.delete !== undefined) {
              const pos = document.positionAt(index);
              const endPos = document.positionAt(index + op.delete);
              const selection = new vscode.Selection(pos, endPos);
              builder.delete(selection);
              this._remoteChanges.push({ index, delete: op.delete });
              index += op.delete;
            } else {
              throw new Error(`collaboration: unexpected case!`);
            }
          });
        });
      } finally {
        release();
      }
    } else {
      vscode.workspace.fs.writeFile(uri, Buffer.from(event.target.toJSON()));
    }
  }

  private async _handleDirectoryEvent(
    event: CollaborationUpdateEventType<"object">,
    uri: vscode.Uri
  ) {
    // apply directory changes
    for (const [key, change] of event.changes.entries()) {
      const entryUri = uri.with({ path: path.join(uri.path, key) });
      switch (change.action) {
        case "add":
          // get value for new entry
          const newValue = event.target.get(key);
          console.log("collaboration: new value", newValue);

          // ensure that new entry is either a file or a directory
          if (
            !isFileWithoutName(newValue) &&
            !isDirectoryWithoutName(newValue)
          ) {
            console.error(
              `New value is neither a file nor a directory!`,
              newValue
            );
            return;
          }

          // add file/directory
          // TODO: better way to check if refresh is needed
          this._fileSystemApi.refreshProjectsView();
          await this._createEntry(entryUri, newValue);
          console.log("refreshing files explorer create entry");

          if (
            uri.path.startsWith(this._fileSystemApi.getCurrentProject().path)
          ) {
            await vscode.commands.executeCommand(
              "workbench.files.action.refreshFilesExplorer"
            );
          }
          break;
        case "update":
          // update entry with value - this should not happen
          break;
        case "delete":
          // delete entry
          await this._deleteEntry(entryUri);
          // TODO: better way to check if refresh is needed
          this._fileSystemApi.refreshProjectsView();
          console.log("refreshing files explorer delete entry");
          if (
            uri.path.startsWith(this._fileSystemApi.getCurrentProject().path)
          ) {
            await vscode.commands.executeCommand(
              "workbench.files.action.refreshFilesExplorer"
            );
          }
          break;
      }
    }
  }

  private async _createEntry(
    uri: vscode.Uri,
    entry: DirectoryWithoutName | FileWithoutName
  ) {
    if (entry.type === "file") {
      await this._createFile(uri, entry);
    } else {
      await this._createDirectory(uri, entry);
    }
  }

  private async _createDirectory(
    uri: vscode.Uri,
    directory: DirectoryWithoutName
  ) {
    await vscode.workspace.fs.createDirectory(uri);
    for (const [name, entry] of Object.entries(directory.content)) {
      const entryUri = uri.with({ path: path.join(uri.path, name) });
      await this._createEntry(entryUri, entry);
    }
  }

  private async _createFile(uri: vscode.Uri, file: FileWithoutName) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(file.content));
  }

  private async _deleteEntry(uri: vscode.Uri) {
    await vscode.workspace.fs.delete(uri, { recursive: true });
  }

  private async _readEntry(uri: vscode.Uri): Promise<Directory | File> {
    const type = (await vscode.workspace.fs.stat(uri)).type;

    if (type !== vscode.FileType.Directory && type !== vscode.FileType.File) {
      throw new Error(
        `Unexpected entry type "${
          type === vscode.FileType.SymbolicLink ? "symbolic link" : "unknown"
        }"!`
      );
    }

    return type === vscode.FileType.Directory
      ? this._readDirectory(uri)
      : this._readFile(uri);
  }

  private async _readDirectory(uri: vscode.Uri): Promise<Directory> {
    const name = path.basename(uri.path);
    const directoryContent = await vscode.workspace.fs.readDirectory(uri);
    const content: Directory["content"] = {};

    for (const [entryName] of directoryContent) {
      const entryUri = uri.with({ path: path.join(uri.path, entryName) });
      const entry = await this._readEntry(entryUri);
      content[entryName] = {
        type: entry.type,
        content: entry.content,
      } as FileWithoutName | DirectoryWithoutName;
    }

    return {
      type: "directory",
      name,
      content,
    };
  }

  private async _readFile(uri: vscode.Uri): Promise<File> {
    const name = path.basename(uri.path);
    const content = new TextDecoder().decode(
      await vscode.workspace.fs.readFile(uri)
    );
    return {
      type: "file",
      name,
      content,
    };
  }

  private async _handleFilesystemCreatedEvent(uri: vscode.Uri) {
    console.log("filesystem created-event:", uri);

    const pathSegments = uri.path.replace("/projects/", "").split("/");
    let value: unknown = this._getValue();
    for (const pathSegment of pathSegments.slice(0, -1)) {
      if (value instanceof CollaborationObject) {
        value = value.get(pathSegment);
        if (!(value instanceof CollaborationObject)) {
          console.error("collaboration: entry is not a collaboration object!");
          return;
        }
        value = value.get("content");
      } else {
        console.error(
          "collaboration: expected collaboration object during filesystem created-event!",
          value,
          pathSegments,
          pathSegment
        );
      }
    }

    const lastPathSegment = pathSegments.at(-1);
    if (value instanceof CollaborationObject && lastPathSegment) {
      const entry = await this._readEntry(uri);
      this._collaborationServiceProsumer.executeTransaction(
        "projects",
        () => {
          value.set(
            lastPathSegment,
            this._collaborationServiceProsumer.valueToCollaborationType(
              "projects",
              { type: entry.type, content: entry.content }
            )
          );
        },
        this
      );
    } else {
      console.error(
        "collaboration: expected collaboration object and last path fragment during filesystem created-event!",
        value,
        pathSegments,
        lastPathSegment
      );
    }
  }

  private async _handleFilesystemChangedEvent(uri: vscode.Uri) {
    console.log("filesystem changed-event:", uri);
  }

  private async _handleFilesystemDeletedEvent(uri: vscode.Uri) {
    console.log("filesystem deleted-event:", uri);

    const pathSegments = uri.path.replace("/projects/", "").split("/");
    let value: unknown = this._getValue();
    for (const pathSegment of pathSegments.slice(0, -1)) {
      if (value instanceof CollaborationObject) {
        value = value.get(pathSegment);
        if (!(value instanceof CollaborationObject)) {
          console.error("collaboration: entry is not a collaboration object!");
          return;
        }
        value = value.get("content");
      } else {
        console.error(
          "collaboration: expected collaboration object during filesystem created-event!",
          value,
          pathSegments,
          pathSegment
        );
      }
    }

    const lastPathSegment = pathSegments.at(-1);
    if (value instanceof CollaborationObject && lastPathSegment) {
      this._collaborationServiceProsumer.executeTransaction(
        "projects",
        () => {
          value.delete(lastPathSegment);
        },
        this
      );
    } else {
      console.error(
        "collaboration: expected map and last path fragment during filesystem created-event!",
        value,
        pathSegments,
        lastPathSegment
      );
    }
  }
}
