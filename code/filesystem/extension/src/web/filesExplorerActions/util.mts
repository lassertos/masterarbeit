import path from "path";
import vscode from "vscode";
import { CrossLabFileSystemProvider } from "../providers/fileSystemProvider.mjs";

export async function copyEntry(
  source: vscode.Uri,
  destination: vscode.Uri
): Promise<vscode.Uri> {
  // check if "entry" can be copied directly
  try {
    await vscode.workspace.fs.stat(destination);
  } catch (error) {
    await vscode.workspace.fs.copy(source, destination);
    return destination;
  }

  // prepare helper values
  const { name, ext } = path.parse(destination.path);
  const match = name.match(/(.*?) copy( ([0-9]*))?$/);
  const nameWithoutCopy = match ? match[1] : name;

  // check if "entry copy" can be copied
  if (!match) {
    const newDestination = destination.with({
      path: `${path.dirname(destination.path)}/${nameWithoutCopy} copy${ext}`,
    });
    try {
      await vscode.workspace.fs.stat(newDestination);
    } catch (error) {
      await vscode.workspace.fs.copy(source, newDestination);
      return newDestination;
    }
  }

  // check if "entry copy i" can be copied
  let index = match && match[3] ? parseInt(match[3]) : 1;
  while (true) {
    const newDestination = destination.with({
      path: `${path.dirname(
        destination.path
      )}/${nameWithoutCopy} copy ${++index}${ext}`,
    });
    try {
      await vscode.workspace.fs.stat(newDestination);
    } catch (error) {
      await vscode.workspace.fs.copy(source, newDestination);
      return newDestination;
    }
  }
}

export async function getSelectedUris(
  fileSystemProvider: CrossLabFileSystemProvider
): Promise<vscode.Uri[]> {
  const savedClipboard = await vscode.env.clipboard.readText();

  await vscode.commands.executeCommand(
    "copyFilePath",
    vscode.Uri.from({
      scheme: "crosslabfs",
      path: "/workspace",
    })
  );
  const clipboard = await vscode.env.clipboard.readText();
  console.log(clipboard);

  const paths = await vscode.env.clipboard.readText();
  // clipboard === savedClipboard
  //   ? fileSystemProvider.currentProject
  //     ? `/projects/${fileSystemProvider.currentProject}`
  //     : "/workspace"
  // : await vscode.env.clipboard.readText();

  console.log(paths);

  await vscode.env.clipboard.writeText(savedClipboard);

  return paths.split("\n").map((path) => {
    const replacement = fileSystemProvider.currentProject
      ? `/projects/${fileSystemProvider.currentProject}`
      : "/workspace";
    const updatedPath = path === "." ? replacement : path;
    return fileSystemProvider.updateUri(
      vscode.Uri.from({
        scheme: "crosslabfs",
        path: updatedPath.replace(/\\/g, "/").replace("~", replacement),
      })
    );
  });
}
