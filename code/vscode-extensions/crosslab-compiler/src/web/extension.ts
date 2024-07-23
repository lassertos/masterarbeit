import * as vscode from "vscode";
import { Directory } from "shared-library";

async function parseDirectory(uri: vscode.Uri): Promise<Directory> {
    const directory: Directory = {
        type: "directory",
        name: uri.path.slice(uri.path.lastIndexOf("/")),
        content: [],
    };

    const entries = await vscode.workspace.fs.readDirectory(uri);
    for (const entry of entries) {
        const entryUri = uri.with({ path: `${uri.path}/${entry[0]}` });
        if (entry[1] === vscode.FileType.File) {
            directory.content.push({
                type: "file",
                name: entry[0],
                content: new TextDecoder().decode(
                    await vscode.workspace.fs.readFile(entryUri),
                ),
            });
        } else if (entry[1] === vscode.FileType.Directory) {
            directory.content.push(await parseDirectory(entryUri));
        }
    }

    return directory;
}

export function activate(context: vscode.ExtensionContext) {
    console.log(
        'Congratulations, your extension "crosslab-compiler" is now active in the web extension host!',
    );

    const helloWorldDisposable = vscode.commands.registerCommand(
        "crosslab-compiler.helloWorld",
        () => {
            vscode.window.showInformationMessage(
                "Hello World from crosslab-compiler in a web extension host!",
            );
        },
    );

    const compileDisposable = vscode.commands.registerCommand(
        "crosslab-compiler.compile",
        async () => {
            vscode.window.showInformationMessage("Trying to compile!");

            const workspaceFolder =
                Array.isArray(vscode.workspace.workspaceFolders) &&
                vscode.workspace.workspaceFolders.length > 0
                    ? (vscode.workspace
                          .workspaceFolders[0] as vscode.WorkspaceFolder)
                    : undefined;

            if (!workspaceFolder) {
                vscode.window.showInformationMessage(
                    "Unable to compile since no workspace folder is open!",
                );
                return;
            }

            const directory = await parseDirectory(workspaceFolder.uri);

            console.log(JSON.stringify(directory, null, 4));
        },
    );

    context.subscriptions.push(helloWorldDisposable, compileDisposable);
}

export function deactivate() {}
