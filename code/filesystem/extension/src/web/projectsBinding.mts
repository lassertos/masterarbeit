import * as vscode from "vscode";
import path from "path";
import {
  Awareness,
  CollaborationServiceProsumer,
  CollaborationString,
  CollaborationType,
  CollaborationUpdateEventType,
} from "@crosslab-ide/crosslab-collaboration-service";
import { Mutex } from "async-mutex";
import { z } from "zod";
import {
  File,
  Directory,
  DirectoryWithoutName,
  FileWithoutName,
} from "@crosslab-ide/filesystem-messaging-protocol";
import { CrossLabFileSystemProvider } from "./providers/fileSystemProvider.mjs";
import { ProjectViewDataProvider } from "./providers/projectViewDataProvider.mjs";
import {
  convertToCollaborationDirectory,
  convertToCollaborationFile,
  convertToDirectoryWithoutName,
  convertToFileWithoutName,
  isCollaborationDirectoryWithoutName,
  isCollaborationFileWithoutName,
} from "./collaborationTypes.mjs";
import { hsvToHex } from "./hsl.mjs";

const awarenessStateSchema = z.object({
  selection: z.object({
    path: z.string(),
    anchor: z.object({ line: z.number(), character: z.number() }),
    head: z.object({ line: z.number(), character: z.number() }),
  }),
});

type AwarenessState = z.infer<typeof awarenessStateSchema>;

function isAwarenessState(input: unknown): input is AwarenessState {
  return awarenessStateSchema.safeParse(input).success;
}

export class ProjectsBinding {
  private _mutex: Mutex = new Mutex();
  private _fileSystemWatchers: Map<string, vscode.FileSystemWatcher> =
    new Map();
  private _remoteChanges: (
    | { index: number; insert: string }
    | { index: number; delete: number }
  )[] = [];
  private _awareness: Awareness;
  private _decorations: Map<string, vscode.TextEditorDecorationType[]> =
    new Map();

  constructor(
    private _fileSystemProvider: CrossLabFileSystemProvider,
    private _projectViewDataProvider: ProjectViewDataProvider,
    private _collaborationServiceProsumer: CollaborationServiceProsumer
  ) {
    this._collaborationServiceProsumer.on(
      "new-participant",
      (participantId) => {
        const uri = vscode.Uri.from({
          scheme: "crosslabfs",
          path: `/shared/${participantId}`,
        });
        this._addFileSystemWatcher(uri);
      }
    );

    this._awareness =
      this._collaborationServiceProsumer.getAwareness("projects");

    this._awareness.setLocalState({});

    vscode.window.onDidChangeActiveTextEditor((textEditor) => {
      console.log("collaboration: active text editor changed", textEditor);

      if (!textEditor) {
        this._awareness.setLocalStateField("selection", null);
        return;
      }

      const selection = textEditor.selection;
      let anchor = selection.isReversed ? selection.end : selection.start;
      let head = selection.isReversed ? selection.start : selection.end;

      const projectUri = this._fileSystemProvider.currentProjectUri;

      if (!projectUri) {
        return;
      }

      this._awareness.setLocalStateField("selection", {
        path: projectUri.path.startsWith("/projects/")
          ? textEditor.document.uri.path.replace(
              "/workspace/",
              `/${this._collaborationServiceProsumer.id}/${projectUri.path
                .split("/")
                .at(2)}/`
            )
          : textEditor.document.uri.path.replace(
              "/workspace/",
              `/${projectUri.path.split("/").at(2)}/${projectUri.path
                .split("/")
                .at(3)}/`
            ),
        anchor: { line: anchor.line, character: anchor.character },
        head: { line: head.line, character: head.character },
      });
    }, this);

    vscode.window.onDidChangeTextEditorSelection((event) => {
      console.log("collaboration: text editor selection changed", event);
      const selection = event.textEditor.selection;
      let anchor = selection.isReversed ? selection.end : selection.start;
      let head = selection.isReversed ? selection.start : selection.end;

      const projectUri = this._fileSystemProvider.currentProjectUri;

      if (!projectUri) {
        return;
      }

      this._awareness.setLocalStateField("selection", {
        path: projectUri.path.startsWith("/projects/")
          ? event.textEditor.document.uri.path.replace(
              "/workspace/",
              `/${this._collaborationServiceProsumer.id}/${projectUri.path
                .split("/")
                .at(2)}/`
            )
          : event.textEditor.document.uri.path.replace(
              "/workspace/",
              `/${projectUri.path.split("/").at(2)}/${projectUri.path
                .split("/")
                .at(3)}/`
            ),
        anchor: { line: anchor.line, character: anchor.character },
        head: { line: head.line, character: head.character },
      });
    }, this);

    this._awareness.on("change", () => {
      console.log("collaboration: rerendering decorations!");
      this._rerenderDecorations();
    });

    vscode.workspace.onDidChangeTextDocument(async (event) => {
      if (
        !this._fileSystemProvider.currentProjectUri ||
        !(
          this._fileSystemWatchers.has(
            this._fileSystemProvider.currentProjectUri.path
          ) ||
          this._fileSystemWatchers.has(
            path.dirname(this._fileSystemProvider.currentProjectUri.path)
          )
        )
      ) {
        return;
      }

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
        const remoteChangeIndex = this._remoteChanges.findIndex(
          (remoteChange) =>
            change.index === remoteChange.index &&
            ("delete" in remoteChange
              ? change.delete === remoteChange.delete
              : change.insert === remoteChange.insert)
        );
        if (remoteChangeIndex >= 0) {
          console.log(
            "collaboration: found remoteChange for change",
            remoteChangeIndex,
            change,
            this._remoteChanges[remoteChangeIndex]
          );

          this._remoteChanges.splice(remoteChangeIndex, 1);

          console.log(
            "collaboration: updated remoteChanges",
            this._remoteChanges
          );
        } else {
          remainingChanges.push(event.contentChanges[index]);
        }
      }

      console.log("collaboration: remaining changes", remainingChanges);

      if (remainingChanges.length === 0) {
        return;
      }

      const projectUri = this._fileSystemProvider.currentProjectUri;

      if (!projectUri) {
        return;
      }

      console.log(
        "collaboration: text document changed (path updated)",
        event.document.uri.with({
          path: event.document.uri.path.startsWith("/workspace/")
            ? event.document.uri.path.replace("/workspace", projectUri.path)
            : event.document.uri.path,
        })
      );
      const updatedPath = event.document.uri.path.startsWith("/workspace/")
        ? event.document.uri.path.replace("/workspace", projectUri.path)
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
              if (accumulator.type !== "object") {
                throw new Error("collaboration: expected map!");
              }
              return accumulator.get(currentValue) as CollaborationType;
            }, this._getValue() as CollaborationType)
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
              if (accumulator.type !== "object") {
                throw new Error(
                  "collaboration: expected collaboration object!"
                );
              }
              return accumulator.get(currentValue) as CollaborationType;
            }, this._getValue(updatedPath.replace("/shared/", "").split("/").at(0)) as CollaborationType);

      console.log("collaboration: collaboration string", collaborationString);

      if (collaborationString.type !== "string") {
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
  }

  private _getValue(key: string = this._collaborationServiceProsumer.id) {
    const collaborationObject =
      this._collaborationServiceProsumer.getCollaborationValue(
        "projects",
        key,
        "object"
      );

    if (collaborationObject.type !== "object") {
      console.error(
        (collaborationObject as any).toJSON(),
        (collaborationObject as any).constructor.name
      );
      throw new Error(
        `Expected property "${key}" of projects to be a collaboration object!`
      );
    }

    console.log("collaboration: collaboration object", collaborationObject);

    return collaborationObject;
  }

  private _rerenderDecorations() {
    const states = this._awareness.getStates();
    console.log("collaboration: rerendering", Array.from(states.entries()));

    for (const decorations of this._decorations.values()) {
      vscode.window.visibleTextEditors.forEach((textEditor) => {
        textEditor.setDecorations(decorations[0], []);
        textEditor.setDecorations(decorations[1], []);
      });
    }

    states.forEach((state, id) => {
      if (
        id !== this._collaborationServiceProsumer.id &&
        isAwarenessState(state)
      ) {
        for (const textEditor of vscode.window.visibleTextEditors) {
          const splitPath = state.selection.path.split("/").slice(1);
          const isLocalPath =
            splitPath[0] === this._collaborationServiceProsumer.id;
          // TODO: find better name
          const translatedPath = isLocalPath
            ? `/projects/${splitPath.slice(1).join("/")}`
            : `/shared/${splitPath.join("/")}`;

          const projectUri = this._fileSystemProvider.currentProjectUri;

          if (!projectUri) {
            return;
          }

          // TODO: find better nameyy
          const adaptedPath = projectUri.path.startsWith("/projects/")
            ? textEditor.document.uri.path.replace(
                "/workspace/",
                `/projects/${projectUri.path.split("/").at(2)}/`
              )
            : textEditor.document.uri.path.replace(
                "/workspace/",
                `/shared/${projectUri.path.split("/").at(2)}/${projectUri.path
                  .split("/")
                  .at(3)}/`
              );

          console.log(adaptedPath, translatedPath);
          if (adaptedPath !== translatedPath) {
            continue;
          }

          const lineStart = Math.min(
            state.selection.anchor.line,
            textEditor.document.lineCount - 1
          );
          const characterStart = Math.min(
            state.selection.anchor.character,
            textEditor.document.lineAt(lineStart).text.length
          );
          const start = new vscode.Position(lineStart, characterStart);

          const lineEnd = Math.min(
            state.selection.head.line,
            textEditor.document.lineCount - 1
          );
          const characterEnd = Math.min(
            state.selection.head.character,
            textEditor.document.lineAt(lineEnd).text.length
          );
          const end = new vscode.Position(lineEnd, characterEnd);

          console.log(start, end);

          let decorations = this._decorations.get(id);
          if (!decorations) {
            const hue = Math.random() * 360;
            const saturation = 1 - Math.random() * 0.5;
            const value = 1 - Math.random() * 0.5;
            const color = hsvToHex(hue, saturation, value);
            console.log("color:", color);
            decorations = [
              vscode.window.createTextEditorDecorationType({
                border: `${color} solid 2px`,
              }),
              vscode.window.createTextEditorDecorationType({
                after: {
                  contentText: `- ${id}`,
                  color,
                  margin: "0.5rem",
                },
              }),
            ];
            this._decorations.set(id, decorations);
          }

          textEditor.setDecorations(decorations[0], [
            new vscode.Range(start, end),
          ]);
          textEditor.setDecorations(decorations[1], [
            new vscode.Range(
              textEditor.document.lineAt(end.line).range.end,
              textEditor.document.lineAt(end.line).range.end
            ),
          ]);
        }
      }
    });
  }

  shareProject(projectUri: vscode.Uri) {
    if (!projectUri.path.startsWith("/projects/")) {
      throw new Error(
        `Cannot share "${projectUri.path}" since it is not a local project!`
      );
    }

    this._addFileSystemWatcher(projectUri);
  }

  private _addFileSystemWatcher(uri: vscode.Uri) {
    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(uri, "**/*")
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

    this._fileSystemWatchers.set(uri.path, fileSystemWatcher);
  }

  unshareProject(projectUri: vscode.Uri) {
    this._fileSystemWatchers.get(projectUri.path)?.dispose();
    this._fileSystemWatchers.delete(projectUri.path);
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
      event.path,
      event.target.type === "object",
      Array.from(
        (event as CollaborationUpdateEventType<"object">).changes.entries()
      )
    );

    // get changed id
    const id = event.path.at(0);

    if (event.path.length === 1) {
      if (event.target.type === "object") {
        for (const [key, value] of (
          event as CollaborationUpdateEventType<"object">
        ).changes.entries()) {
          const sharedProjectUri = vscode.Uri.from({
            scheme: "crosslabfs",
            path: `/shared/${id}/${key}`,
          });
          if (value.action === "add") {
            const directory = event.target.get(key)?.toJSON();
            console.log(
              "collaboration: directory",
              directory,
              isCollaborationDirectoryWithoutName(directory)
            );
            if (!isCollaborationDirectoryWithoutName(directory)) {
              return;
            }
            await this._createDirectory(
              sharedProjectUri,
              convertToDirectoryWithoutName(directory)
            );
            this._projectViewDataProvider.addRemoteProject(sharedProjectUri);
            this._projectViewDataProvider.refresh();
          } else if (value.action === "delete") {
            await vscode.workspace.fs.delete(sharedProjectUri, {
              recursive: true,
            });
            if (
              this._fileSystemProvider.currentProjectUri?.path ===
              sharedProjectUri.path
            ) {
              this._fileSystemProvider.setProject(null);
            }
            this._projectViewDataProvider.removeRemoteProject(sharedProjectUri);
            this._projectViewDataProvider.refresh();
          }
        }
      }
      return;
    }

    if (!id) {
      throw new Error(
        `Path "${`/${event.path.join(
          "/"
        )}`}" is not formatted as expected! (expected: "/{id}/...")`
      );
    }

    if (typeof id !== "string") {
      throw new Error(`Expected id to be of type "string", got "${typeof id}"`);
    }

    // check that path is valid
    const eventPath = event.path.slice(1);
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
        if (event.target.type !== "string") {
          throw new Error(`Event target is not a collaboration string!`);
        }
        await this._handleFileEvents(
          event as CollaborationUpdateEventType<"string">,
          uri
        );
        break;
      case vscode.FileType.Directory:
        if (event.target.type !== "object") {
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
    const projectUri = this._fileSystemProvider.currentProjectUri;

    if (!projectUri) {
      return;
    }

    const textEditor = vscode.window.visibleTextEditors.find(
      (visibleTextEditor) =>
        visibleTextEditor.document.uri.scheme === uri.scheme &&
        visibleTextEditor.document.uri.path ===
          (uri.path.startsWith(projectUri.path)
            ? uri.path.replace(projectUri.path, "/workspace")
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
        this._rerenderDecorations();
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
        case "add": {
          // get value for new entry
          const newValue = event.target.get(key)?.toJSON();
          console.log("collaboration: new value", newValue);

          // ensure that new entry is either a file or a directory
          if (
            !isCollaborationFileWithoutName(newValue) &&
            !isCollaborationDirectoryWithoutName(newValue)
          ) {
            console.error(
              `New value is neither a file nor a directory!`,
              newValue
            );
            return;
          }

          // add file/directory
          // TODO: better way to check if refresh is needed
          this._projectViewDataProvider.refresh();
          await this._createEntry(
            entryUri,
            newValue.type === "file"
              ? convertToFileWithoutName(newValue)
              : convertToDirectoryWithoutName(newValue)
          );
          console.log("refreshing files explorer create entry");

          const projectUri = this._fileSystemProvider.currentProjectUri;

          if (!projectUri) {
            return;
          }

          if (uri.path.startsWith(projectUri.path)) {
            await vscode.commands.executeCommand(
              "workbench.files.action.refreshFilesExplorer"
            );
          }
          break;
        }
        case "update":
          // update entry with value - this should not happen
          break;
        case "delete": {
          // delete entry
          await this._deleteEntry(entryUri);
          // TODO: better way to check if refresh is needed
          this._projectViewDataProvider.refresh();
          console.log("refreshing files explorer delete entry");

          const projectUri = this._fileSystemProvider.currentProjectUri;

          if (!projectUri) {
            return;
          }

          if (uri.path.startsWith(projectUri.path)) {
            await vscode.commands.executeCommand(
              "workbench.files.action.refreshFilesExplorer"
            );
          }
          break;
        }
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
    const content = await vscode.workspace.fs.readFile(uri);
    return {
      type: "file",
      name,
      content,
    };
  }

  private async _handleFilesystemCreatedEvent(uri: vscode.Uri) {
    console.log("filesystem created-event:", uri);

    const pathSegments = uri.path.startsWith("/projects/")
      ? uri.path
          .replace("/projects/", `${this._collaborationServiceProsumer.id}/`)
          .split("/")
      : uri.path.replace("/shared/", "").split("/");
    let value = this._getValue(pathSegments[0]) as
      | CollaborationType
      | undefined;
    for (const pathSegment of pathSegments.slice(1, -1)) {
      if (value?.type === "object") {
        value = value.get(pathSegment);
        if (value?.type !== "object") {
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
    if (value?.type === "object" && lastPathSegment) {
      const entry = await this._readEntry(uri);
      const collaborationEntry =
        entry.type === "file"
          ? convertToCollaborationFile(entry)
          : convertToCollaborationDirectory(entry);
      console.log(collaborationEntry);
      this._collaborationServiceProsumer.executeTransaction(
        "projects",
        () => {
          value.set(
            lastPathSegment,
            this._collaborationServiceProsumer.valueToCollaborationType(
              "projects",
              collaborationEntry
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

    const pathSegments = uri.path.startsWith("/projects/")
      ? uri.path
          .replace("/projects/", `${this._collaborationServiceProsumer.id}/`)
          .split("/")
      : uri.path.replace("/shared/", "").split("/");
    let value = this._getValue(pathSegments[0]) as
      | CollaborationType
      | undefined;
    for (const pathSegment of pathSegments.slice(1, -1)) {
      if (value?.type === "object") {
        value = value.get(pathSegment);
        if (value?.type !== "object") {
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
    if (value?.type === "object" && lastPathSegment) {
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
