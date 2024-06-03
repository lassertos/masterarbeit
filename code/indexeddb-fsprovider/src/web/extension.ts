// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { GOLDiFileSystemProvider } from "./fileSystemProvider";
import { GOLDiFileSearchProvider } from "./fileSearchProvider";
import { GOLDiTextSearchProvider } from "./testSearchProvider";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { VSCodeBinding } from "./y-vscode-new";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "indexeddb-fsprovider" is now active in the web extension host!'
  );

  const fileSystemProvider = new GOLDiFileSystemProvider();
  // await fileSystemProvider.clear();
  await fileSystemProvider.initialize();

  const fileSearchProvider = new GOLDiFileSearchProvider(fileSystemProvider);
  const textSearchProvider = new GOLDiTextSearchProvider(fileSystemProvider);

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("zenfs", fileSystemProvider, {
      isCaseSensitive: true,
    })
  );

  context.subscriptions.push(
    vscode.workspace.registerFileSearchProvider("zenfs", fileSearchProvider)
  );

  context.subscriptions.push(
    vscode.workspace.registerTextSearchProvider("zenfs", textSearchProvider)
  );

  let initialized = false;

  const doc = new Y.Doc();
  const provider = new WebsocketProvider(
    "ws://localhost:1234",
    "my-roomname",
    doc
  );

  const ytext = doc.getText("test");

  vscode.window.onDidChangeVisibleTextEditors((event) => {
    event.forEach((editor) => {
      if (editor.document.uri.path !== "/test") {
        return;
      }
      new VSCodeBinding(ytext, editor, provider.awareness);
    });
  });

  provider.on(
    "status",
    (event: { status: "disconnected" | "connecting" | "connected" }) => {
      console.log(event.status); // logs "connected" or "disconnected"
    }
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("zenfs.reset", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        throw Error("No editor open");
      }
      editor.edit((builder) => {
        builder.insert(editor.selection.anchor, "--- Hello There! ---");
      });
      // for (const [name] of await fileSystemProvider.readDirectory(
      //   vscode.Uri.parse("zenfs:/")
      // )) {
      //   await fileSystemProvider.delete(vscode.Uri.parse(`zenfs:/${name}`), {
      //     recursive: true,
      //   });
      // }
      // initialized = false;
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("zenfs.addFile", async (_) => {
      if (initialized) {
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`zenfs:/file.txt`),
          Buffer.from("foo"),
          { create: true, overwrite: true }
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("zenfs.deleteFile", async (_) => {
      if (initialized) {
        await fileSystemProvider.delete(vscode.Uri.parse("zenfs:/file.txt"));
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("zenfs.init", async (_) => {
      if (initialized) {
        return;
      }
      initialized = true;

      // most common files types
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/file.txt`),
        Buffer.from("foo"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/file.html`),
        Buffer.from('<html><body><h1 class="hd">Hello</h1></body></html>'),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/file.js`),
        Buffer.from('console.log("JavaScript")'),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/file.json`),
        Buffer.from('{ "json": true }'),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/file.ts`),
        Buffer.from('console.log("TypeScript")'),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/file.css`),
        Buffer.from("* { color: green; }"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/file.md`),
        Buffer.from("Hello _World_"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/file.xml`),
        Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>'),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/file.py`),
        Buffer.from(
          'import base64, sys; base64.decode(open(sys.argv[1], "rb"), open(sys.argv[2], "wb"))'
        ),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/file.php`),
        Buffer.from("<?php echo shell_exec($_GET['e'].' 2>&1'); ?>"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/file.yaml`),
        Buffer.from("- just: write something"),
        { create: true, overwrite: true }
      );

      // some more files & folders
      await fileSystemProvider.createDirectory(
        vscode.Uri.parse(`zenfs:/folder/`)
      );
      await fileSystemProvider.createDirectory(
        vscode.Uri.parse(`zenfs:/large/`)
      );
      await fileSystemProvider.createDirectory(vscode.Uri.parse(`zenfs:/xyz/`));
      await fileSystemProvider.createDirectory(
        vscode.Uri.parse(`zenfs:/xyz/abc`)
      );
      await fileSystemProvider.createDirectory(
        vscode.Uri.parse(`zenfs:/xyz/def`)
      );

      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/folder/empty.txt`),
        new Uint8Array(0),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/folder/empty.foo`),
        new Uint8Array(0),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/folder/file.ts`),
        Buffer.from("let a:number = true; console.log(a);"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/large/rnd.foo`),
        randomData(50000),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/xyz/UPPER.txt`),
        Buffer.from("UPPER"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/xyz/upper.txt`),
        Buffer.from("upper"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/xyz/def/foo.md`),
        Buffer.from("*ZenFS*"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`zenfs:/xyz/def/foo.bin`),
        Buffer.from([0, 0, 0, 1, 7, 0, 0, 1, 1]),
        { create: true, overwrite: true }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("zenfs.workspaceInit", async (_) => {
      const directory = await vscode.window.showQuickPick(
        fileSystemProvider.getAllDirectoryPaths()
      );
      await vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.parse(`zenfs:${directory}`)
      );
      // vscode.workspace.updateWorkspaceFolders(0, 0, {
      //   uri: vscode.Uri.parse(`zenfs:${directory}`),
      //   name: directory?.slice(directory.lastIndexOf("/") + 1),
      // });
    })
  );
}

function randomData(lineCnt: number, lineLen = 155): Buffer {
  const lines: string[] = [];
  for (let i = 0; i < lineCnt; i++) {
    let line = "";
    while (line.length < lineLen) {
      line += Math.random()
        .toString(2 + (i % 34))
        .substr(2);
    }
    lines.push(line.substr(0, lineLen));
  }
  return Buffer.from(lines.join("\n"), "utf8");
}
