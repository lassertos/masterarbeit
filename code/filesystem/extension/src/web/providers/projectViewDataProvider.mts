import vscode from "vscode";

export class ProjectViewDataProvider
  implements vscode.TreeDataProvider<string>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    string | undefined | null | void
  > = new vscode.EventEmitter<string | undefined | null | void>();

  onDidChangeTreeData?:
    | vscode.Event<string | void | string[] | null | undefined>
    | undefined = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: string): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return {
      label: element,
      iconPath: new vscode.ThemeIcon("file-directory"),
      contextValue: "project",
    };
  }

  async getChildren(element?: string | undefined): Promise<string[]> {
    if (element) {
      return [];
    }

    return (
      await vscode.workspace.fs.readDirectory(
        vscode.Uri.from({ scheme: "crosslabfs", path: "/projects" })
      )
    )
      .filter((entry) => entry[1] === vscode.FileType.Directory)
      .map((entry) => entry[0])
      .sort();
  }

  getParent?(_element: string): vscode.ProviderResult<string> {
    return undefined;
  }

  resolveTreeItem?(
    _item: vscode.TreeItem,
    _element: string,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TreeItem> {
    return undefined;
  }
}
