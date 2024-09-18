// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { GOLDiFileSystemProvider } from "./fileSystemProvider";
import { GOLDiFileSearchProvider } from "./fileSearchProvider";
import { GOLDiTextSearchProvider } from "./testSearchProvider";

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "indexeddb-fsprovider" is now active in the web extension host!'
  );

  const fileSystemProvider = new GOLDiFileSystemProvider();
  await fileSystemProvider.initialize();

  const fileSearchProvider = new GOLDiFileSearchProvider(fileSystemProvider);
  const textSearchProvider = new GOLDiTextSearchProvider(fileSystemProvider);

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("idbfs", fileSystemProvider, {
      isCaseSensitive: true,
    })
  );

  context.subscriptions.push(
    vscode.workspace.registerFileSearchProvider("idbfs", fileSearchProvider)
  );

  context.subscriptions.push(
    vscode.workspace.registerTextSearchProvider("idbfs", textSearchProvider)
  );

  let initialized = false;

  context.subscriptions.push(
    vscode.commands.registerCommand("idbfs.reset", async () => {
      for (const [name] of await fileSystemProvider.readDirectory(
        vscode.Uri.parse("idbfs:/")
      )) {
        await fileSystemProvider.delete(vscode.Uri.parse(`idbfs:/${name}`), {
          recursive: true,
        });
      }
      initialized = false;
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("idbfs.addFile", async (_) => {
      if (initialized) {
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`idbfs:/file.txt`),
          Buffer.from("foo"),
          { create: true, overwrite: true }
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("idbfs.deleteFile", async (_) => {
      if (initialized) {
        await fileSystemProvider.delete(vscode.Uri.parse("idbfs:/file.txt"));
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("idbfs.init", async (_) => {
      if (initialized) {
        return;
      }
      initialized = true;

      // most common files types
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/file.txt`),
        Buffer.from("foo"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/file.html`),
        Buffer.from('<html><body><h1 class="hd">Hello</h1></body></html>'),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/file.js`),
        Buffer.from('console.log("JavaScript")'),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/file.json`),
        Buffer.from('{ "json": true }'),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/file.ts`),
        Buffer.from('console.log("TypeScript")'),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/file.css`),
        Buffer.from("* { color: green; }"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/file.md`),
        Buffer.from("Hello _World_"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/file.xml`),
        Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>'),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/file.py`),
        Buffer.from(
          'import base64, sys; base64.decode(open(sys.argv[1], "rb"), open(sys.argv[2], "wb"))'
        ),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/file.php`),
        Buffer.from("<?php echo shell_exec($_GET['e'].' 2>&1'); ?>"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/file.yaml`),
        Buffer.from("- just: write something"),
        { create: true, overwrite: true }
      );

      // some more files & folders
      await fileSystemProvider.createDirectory(
        vscode.Uri.parse(`idbfs:/folder/`)
      );
      await fileSystemProvider.createDirectory(
        vscode.Uri.parse(`idbfs:/large/`)
      );
      await fileSystemProvider.createDirectory(vscode.Uri.parse(`idbfs:/xyz/`));
      await fileSystemProvider.createDirectory(
        vscode.Uri.parse(`idbfs:/xyz/abc`)
      );
      await fileSystemProvider.createDirectory(
        vscode.Uri.parse(`idbfs:/xyz/def`)
      );

      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/folder/empty.txt`),
        new Uint8Array(0),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/folder/empty.foo`),
        new Uint8Array(0),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/folder/file.ts`),
        Buffer.from("let a:number = true; console.log(a);"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/large/rnd.foo`),
        randomData(50000),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/xyz/UPPER.txt`),
        Buffer.from("UPPER"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/xyz/upper.txt`),
        Buffer.from("upper"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/xyz/def/foo.md`),
        Buffer.from("*idbfs*"),
        { create: true, overwrite: true }
      );
      await fileSystemProvider.writeFile(
        vscode.Uri.parse(`idbfs:/xyz/def/foo.bin`),
        Buffer.from([0, 0, 0, 1, 7, 0, 0, 1, 1]),
        { create: true, overwrite: true }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("idbfs.workspaceInit", async (_) => {
      const directory = await vscode.window.showQuickPick(
        fileSystemProvider.getAllDirectoryPaths()
      );
      await vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.parse(`idbfs:${directory}`)
      );
      // vscode.workspace.updateWorkspaceFolders(0, 0, {
      //   uri: vscode.Uri.parse(`idbfs:${directory}`),
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
