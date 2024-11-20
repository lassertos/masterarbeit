import path from "path";
import vscode from "vscode";

export class ProjectViewDataProvider
  implements vscode.TreeDataProvider<vscode.Uri>
{
  private _projectRootFolders: Map<string, vscode.Uri> = new Map();
  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.Uri | undefined | null | void
  > = new vscode.EventEmitter<vscode.Uri | undefined | null | void>();

  onDidChangeTreeData?:
    | vscode.Event<vscode.Uri | void | vscode.Uri[] | null | undefined>
    | undefined = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(
    element: vscode.Uri
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const [title, projectRootFolder] = Array.from(
      this._projectRootFolders.entries()
    ).find(
      ([_, projectRootFolder]) => projectRootFolder.path === element.path
    ) ?? [undefined, undefined];

    if (title && projectRootFolder) {
      return {
        label: title,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      };
    }

    return {
      label: path.basename(element.path),
      iconPath: new vscode.ThemeIcon("file-directory"),
      contextValue: "project",
    };
  }

  async getChildren(element?: vscode.Uri | undefined): Promise<vscode.Uri[]> {
    console.log("project view data provider:", element);

    if (!element) {
      return Array.from(this._projectRootFolders.values());
    }

    const projectRootFolder = Array.from(
      this._projectRootFolders.values()
    ).find((projectRootFolder) => projectRootFolder.path === element.path);

    if (!projectRootFolder) {
      return [];
    }

    console.log("project view data provider:", projectRootFolder);

    const result = (await vscode.workspace.fs.readDirectory(projectRootFolder))
      .filter((entry) => entry[1] === vscode.FileType.Directory)
      .map((entry) =>
        vscode.Uri.from({
          scheme: "crosslabfs",
          path: path.join(projectRootFolder.path, entry[0]),
        })
      )
      .sort();

    console.log("project view data provider:", result);

    return result;
  }

  getParent?(element: vscode.Uri): vscode.ProviderResult<vscode.Uri> {
    return Array.from(this._projectRootFolders.values()).find(
      (projectRootFolder) => projectRootFolder.path.startsWith(element.path)
    );
  }

  resolveTreeItem?(
    _item: vscode.TreeItem,
    _element: vscode.Uri,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TreeItem> {
    return undefined;
  }

  addProjectRootFolder(title: string, uri: vscode.Uri) {
    this._projectRootFolders.set(title, uri);
    this.refresh();
  }
}
