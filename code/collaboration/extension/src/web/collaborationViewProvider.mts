import * as vscode from "vscode";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { VSCodeBinding } from "./y-vscode.mjs";
import { Message } from "./messages.mjs";

export class CollaborationViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "collaboration.view";
  private _status: {
    doc?: Y.Doc;
    provider?: WebsocketProvider;
    changeListener?: vscode.Disposable;
    bindings: VSCodeBinding[];
  } = { bindings: [] };

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): Thenable<void> | void {
    context.state;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message: Message) => {
      switch (message.type) {
        case "create": {
          this._joinSession();
        }
        case "join": {
          this._joinSession();
        }
      }
    });
  }

  private _joinSession() {
    this._status.doc = new Y.Doc();
    this._status.provider = new WebsocketProvider(
      "ws://localhost:1234",
      "my-roomname",
      this._status.doc
    );

    while (this._status.bindings.length > 0) {
      const binding = this._status.bindings.pop();
      binding?.destroy();
    }

    vscode.window.onDidChangeVisibleTextEditors((event) => {
      while (this._status.bindings.length > 0) {
        const binding = this._status.bindings.pop();
        binding?.destroy();
      }
      event.forEach((editor) => {
        if (typeof editor.document === "string") {
          return;
        }
        if (!this._status.doc || !this._status.provider) {
          return;
        }
        console.log("creating new binding for", editor.document.uri.path);
        const ytext = this._status.doc?.getText(editor.document.uri.path);
        this._status.bindings.push(
          new VSCodeBinding(ytext, editor, this._status.provider.awareness)
        );
      });
    });

    this._status.provider.on(
      "status",
      (event: { status: "disconnected" | "connecting" | "connected" }) => {
        console.log(event.status);
      }
    );
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "web", "main.js")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">

          <!--
          Use a content security policy to only allow loading styles from our extension directory,
          and only allow scripts that have a specific nonce.
          (See the 'webview-sample' extension sample for img-src content security policy examples)
          -->
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

          <meta name="viewport" content="width=device-width, initial-scale=1.0">

          <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
          </script>
          <script nonce="${nonce}" src="${scriptUri}"></script>
        </head>
        <body>
          <collaboration-view></collaboration-view>
        </body>
        </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
