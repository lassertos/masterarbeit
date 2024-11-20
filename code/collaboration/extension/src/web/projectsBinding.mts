import * as Y from "yjs";
import * as vscode from "vscode";
import path from "path";
import {
  valueFromYjs,
  yjsFromValue,
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
  } = {
    getCurrentProject: () => vscode.Uri.from({ scheme: "crosslabfs" }),
    refreshProjectsView: () => undefined,
  };

  private _yjsChanges: (
    | { index: number; insert: string }
    | { index: number; delete: number }
  )[] = [];

  getValue: (
    key?: string
  ) => Y.Map<unknown> | Y.Array<unknown> | Y.Text | undefined = () => undefined;

  constructor() {
    // vscode.window.onDidChangeVisibleTextEditors((editors) => {
    //   console.log("changed visible text editors:", editors);
    // });

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
        this._yjsChanges
      );

      const remainingChanges: vscode.TextDocumentContentChangeEvent[] = [];

      for (const [index, change] of changes.entries()) {
        const yjsChangeIndex = this._yjsChanges.findIndex(
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
            this._yjsChanges[yjsChangeIndex]
          );

          this._yjsChanges.splice(yjsChangeIndex, 1);

          console.log("collaboration: updated yjsChanges", this._yjsChanges);
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

      // const textEditor = vscode.window.visibleTextEditors.find(
      //   (visibleTextEditor) => visibleTextEditor.document === event.document
      // );

      // console.log("collaboration: text editor", textEditor);

      // TOOD: get value corresponding to correct shared project
      const yText = updatedPath.startsWith("/projects/")
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
              if (!(accumulator instanceof Y.Map)) {
                throw new Error("collaboration: expected map!");
              }
              return accumulator.get(currentValue) as Y.Map<unknown>;
            }, this.getValue())
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
              if (!(accumulator instanceof Y.Map)) {
                throw new Error("collaboration: expected map!");
              }
              return accumulator.get(currentValue) as Y.Map<unknown>;
            }, this.getValue(updatedPath.replace("/shared/", "").split("/").at(0)));

      console.log("collaboration: ytext", yText);

      if (!(yText instanceof Y.Text)) {
        throw new Error("collaboration: expected text!");
      }
      // if (!textEditor || event.document.getText() === yText.toJSON()) {
      //   return;
      // }
      if (event.document.getText() === yText.toJSON()) {
        return;
      }

      yText.doc?.transact(() => {
        console.log("collaboration: before", yText.toJSON());
        remainingChanges
          .sort((change1, change2) => change2.rangeOffset - change1.rangeOffset)
          .forEach((change) => {
            yText.delete(change.rangeOffset, change.rangeLength);
            yText.insert(change.rangeOffset, change.text);
          });
        console.log("collaboration: after", yText.toJSON());
      }, this);
    }, this);

    // TODO: this should be done over the collaboration ui
    this.shareProject(
      vscode.Uri.from({
        scheme: "crosslabfs",
        path: "/projects/collaboration-test",
      })
    );
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
    events: Y.YEvent<any>[],
    transaction: Y.Transaction,
    id: string,
    localId: string
  ) {
    console.log("collaboration: handling events", events);

    if (transaction.origin === this) {
      return;
    }

    const value = this.getValue(id);

    // check that value is correct type
    if (!(value instanceof Y.Map)) {
      throw new Error(`Expected value to be of type "Y.Map"!`);
    }

    for (const event of events) {
      this._handleEvent(event, value, id, localId);
    }
  }

  private async _handleEvent(
    event: Y.YEvent<any>,
    value: Y.Map<unknown>,
    id: string,
    localId: string
  ) {
    // check that path is valid
    const eventPath = event.path;
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

    const changes = event.changes;

    console.log("collaboration: changes", changes);

    const keys = changes.keys;

    console.log("collaboration: keys", Array.from(keys.entries()));

    const delta = changes.delta;

    console.log("collaboration: delta", delta);

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
        await this._handleFileEvents(value, uri, filteredEventPath, delta);
        break;
      case vscode.FileType.Directory:
        await this._handleDirectoryEvents(value, uri, filteredEventPath, keys);
        break;
      case vscode.FileType.SymbolicLink:
        break;
    }
  }

  private async _handleFileEvents(
    value: Y.Map<unknown>,
    uri: vscode.Uri,
    pathSegments: string[],
    delta: {
      insert?: Array<any> | string;
      delete?: number;
      retain?: number;
    }[]
  ) {
    const yText = pathSegments.reduce((accumulator, v) => {
      return accumulator.get(v) as any;
    }, value) as any;

    if (!(yText instanceof Y.Text)) {
      console.error("collaboration: path does not lead to ytext", pathSegments);
    }

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
      value,
      uri,
      pathSegments,
      delta,
      yText,
      textEditor
    );

    if (textEditor) {
      const release = await this._mutex.acquire();
      try {
        let index = 0;
        await textEditor.edit((builder) => {
          const document = textEditor.document;
          delta.forEach((op) => {
            if (op.retain !== undefined) {
              index += op.retain;
            } else if (op.insert !== undefined) {
              const pos = document.positionAt(index);
              console.log(index, pos);
              const insert = op.insert as string;
              builder.insert(pos, insert);
              this._yjsChanges.push({ index, insert });
            } else if (op.delete !== undefined) {
              const pos = document.positionAt(index);
              const endPos = document.positionAt(index + op.delete);
              const selection = new vscode.Selection(pos, endPos);
              builder.delete(selection);
              this._yjsChanges.push({ index, delete: op.delete });
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
      vscode.workspace.fs.writeFile(
        uri,
        Buffer.from((yText as Y.Text).toJSON())
      );
    }
  }

  private async _handleDirectoryEvents(
    value: Y.Map<unknown>,
    uri: vscode.Uri,
    pathSegments: string[],
    keys: Map<
      string,
      {
        action: "add" | "update" | "delete";
        oldValue: any;
      }
    >
  ) {
    // apply directory changes
    for (const [key, change] of keys) {
      await this._handleDirectoryEvent(value, uri, pathSegments, key, change);
    }
  }

  private async _handleDirectoryEvent(
    value: Y.Map<unknown>,
    uri: vscode.Uri,
    pathSegments: string[],
    key: string,
    change: {
      action: "add" | "update" | "delete";
      oldValue: any;
    }
  ) {
    const entryUri = uri.with({ path: path.join(uri.path, key) });
    switch (change.action) {
      case "add":
        // get value for new entry
        const newValue = valueFromYjs(
          [...pathSegments, key].reduce((accumulator, v) => {
            return accumulator.get(v) as Y.Map<unknown>;
          }, value)
        );
        console.log("collaboration: new value", newValue);

        // ensure that new entry is either a file or a directory
        if (!isFileWithoutName(newValue) && !isDirectoryWithoutName(newValue)) {
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

        if (uri.path.startsWith(this._fileSystemApi.getCurrentProject().path)) {
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
        if (uri.path.startsWith(this._fileSystemApi.getCurrentProject().path)) {
          await vscode.commands.executeCommand(
            "workbench.files.action.refreshFilesExplorer"
          );
        }
        break;
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
    let value: unknown = this.getValue();
    for (const pathSegment of pathSegments.slice(0, -1)) {
      if (value instanceof Y.Map) {
        value = value.get(pathSegment);
        if (!(value instanceof Y.Map)) {
          console.error("collaboration: entry is not a map!");
          return;
        }
        value = value.get("content");
      } else {
        console.error(
          "collaboration: expected map during filesystem created-event!",
          value,
          pathSegments,
          pathSegment
        );
      }
    }

    const lastPathSegment = pathSegments.at(-1);
    if (value instanceof Y.Map && lastPathSegment) {
      const entry = await this._readEntry(uri);
      value.doc?.transact(() => {
        value.set(
          lastPathSegment,
          yjsFromValue({ type: entry.type, content: entry.content })
        );
      }, this);
    } else {
      console.error(
        "collaboration: expected map and last path fragment during filesystem created-event!",
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
    let value: unknown = this.getValue();
    for (const pathSegment of pathSegments.slice(0, -1)) {
      if (value instanceof Y.Map) {
        value = value.get(pathSegment);
        if (!(value instanceof Y.Map)) {
          console.error("collaboration: entry is not a map!");
          return;
        }
        value = value.get("content");
      } else {
        console.error(
          "collaboration: expected map during filesystem created-event!",
          value,
          pathSegments,
          pathSegment
        );
      }
    }

    const lastPathSegment = pathSegments.at(-1);
    if (value instanceof Y.Map && lastPathSegment) {
      value.doc?.transact(() => {
        value.delete(lastPathSegment);
      }, this);
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
