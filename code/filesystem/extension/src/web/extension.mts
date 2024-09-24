import * as vscode from "vscode";
import { CrossLabFileSystemProvider } from "./providers/fileSystemProvider.mjs";
import { CrossLabFileSearchProvider } from "./providers/fileSearchProvider.mjs";
import { CrossLabTextSearchProvider } from "./providers/textSearchProvider.mjs";

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

  let initialized = false;

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "crosslab-filesystem-extension.reset",
      async () => {
        for (const [name] of await fileSystemProvider.readDirectory(
          vscode.Uri.parse("crosslabfs:/")
        )) {
          await fileSystemProvider.delete(
            vscode.Uri.parse(`crosslabfs:/${name}`),
            {
              recursive: true,
            }
          );
        }
        initialized = false;
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "crosslab-filesystem-extension.addFile",
      async (_) => {
        if (initialized) {
          await fileSystemProvider.writeFile(
            vscode.Uri.parse(`crosslabfs:/file.txt`),
            Buffer.from("foo"),
            { create: true, overwrite: true }
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "crosslab-filesystem-extension.deleteFile",
      async (_) => {
        if (initialized) {
          await fileSystemProvider.delete(
            vscode.Uri.parse("crosslabfs:/file.txt")
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "crosslab-filesystem-extension.init",
      async (_) => {
        if (initialized) {
          return;
        }
        initialized = true;

        // most common files types
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/file.txt`),
          Buffer.from("foo"),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/file.html`),
          Buffer.from('<html><body><h1 class="hd">Hello</h1></body></html>'),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/file.js`),
          Buffer.from('console.log("JavaScript")'),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/file.json`),
          Buffer.from('{ "json": true }'),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/file.ts`),
          Buffer.from('console.log("TypeScript")'),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/file.css`),
          Buffer.from("* { color: green; }"),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/file.md`),
          Buffer.from("Hello _World_"),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/file.xml`),
          Buffer.from(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>'
          ),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/file.py`),
          Buffer.from(
            'import base64, sys; base64.decode(open(sys.argv[1], "rb"), open(sys.argv[2], "wb"))'
          ),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/file.php`),
          Buffer.from("<?php echo shell_exec($_GET['e'].' 2>&1'); ?>"),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/file.yaml`),
          Buffer.from("- just: write something"),
          { create: true, overwrite: true }
        );

        // some more files & folders
        await fileSystemProvider.createDirectory(
          vscode.Uri.parse(`crosslabfs:/folder/`)
        );
        await fileSystemProvider.createDirectory(
          vscode.Uri.parse(`crosslabfs:/large/`)
        );
        await fileSystemProvider.createDirectory(
          vscode.Uri.parse(`crosslabfs:/xyz/`)
        );
        await fileSystemProvider.createDirectory(
          vscode.Uri.parse(`crosslabfs:/xyz/abc`)
        );
        await fileSystemProvider.createDirectory(
          vscode.Uri.parse(`crosslabfs:/xyz/def`)
        );

        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/folder/empty.txt`),
          new Uint8Array(0),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/folder/empty.foo`),
          new Uint8Array(0),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/folder/file.ts`),
          Buffer.from("let a:number = true; console.log(a);"),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/large/rnd.foo`),
          randomData(50000),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/xyz/UPPER.txt`),
          Buffer.from("UPPER"),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/xyz/upper.txt`),
          Buffer.from("upper"),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/xyz/def/foo.md`),
          Buffer.from("*file*"),
          { create: true, overwrite: true }
        );
        await fileSystemProvider.writeFile(
          vscode.Uri.parse(`crosslabfs:/xyz/def/foo.bin`),
          Buffer.from([0, 0, 0, 1, 7, 0, 0, 1, 1]),
          { create: true, overwrite: true }
        );
      }
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
