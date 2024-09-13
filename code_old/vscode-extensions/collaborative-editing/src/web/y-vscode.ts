import * as Y from "yjs";
import * as vscode from "vscode";
import * as error from "lib0/error";
import { Awareness } from "y-protocols/awareness"; // eslint-disable-line
import { Mutex } from "async-mutex";

export class VSCodeBinding {
  private _ytext: Y.Text;
  private _ydoc: Y.Doc;
  private _editor: vscode.TextEditor;
  private _awareness: Awareness | null;
  private _mutex: Mutex;
  private _changeHandler: vscode.Disposable;
  private _closeHandler: vscode.Disposable;
  private _decorations: Map<number, vscode.TextEditorDecorationType[]>;
  private _ytextObserverHandler: (
    event: Y.YTextEvent,
    transaction: Y.Transaction
  ) => Promise<void>;
  private _rerenderDecorationsHandler: () => void;
  private _numberOfSyncOperations: number;

  constructor(
    ytext: Y.Text,
    editor: vscode.TextEditor,
    awareness: Awareness | null = null
  ) {
    if (!ytext.doc) {
      throw new Error("YText instance does not have an associated document!");
    }
    this._ytext = ytext;
    this._ydoc = ytext.doc;
    this._editor = editor;
    this._awareness = awareness;
    this._mutex = new Mutex();
    this._decorations = new Map();
    this._numberOfSyncOperations = 0;

    this._ytextObserverHandler = this._ytextObserver.bind(this);
    this._rerenderDecorationsHandler = this._rerenderDecorations.bind(this);

    this._ytext.observe(this._ytextObserverHandler);

    const ytextValue = ytext.toJSON();
    if (this._editor.document.getText() !== ytextValue) {
      this._editor.edit((builder) => {
        builder.replace(
          new vscode.Range(
            this._editor.document.lineAt(0).range.start,
            this._editor.document.lineAt(
              this._editor.document.lineCount - 1
            ).range.end
          ),
          ytextValue
        );
      });
    }

    this._changeHandler = vscode.workspace.onDidChangeTextDocument(
      async (event) => {
        const release = await this._mutex.acquire();

        try {
          if (
            event.document !== this._editor.document ||
            event.document.getText() === this._ytext.toJSON() ||
            this._numberOfSyncOperations > 0
          ) {
            return;
          }

          this._ydoc.transact(() => {
            Array.from(event.contentChanges)
              .sort(
                (change1, change2) => change2.rangeOffset - change1.rangeOffset
              )
              .forEach((change) => {
                this._ytext.delete(change.rangeOffset, change.rangeLength);
                this._ytext.insert(change.rangeOffset, change.text);
              });
          });
        } finally {
          release();
        }
      },
      this
    );

    this._closeHandler = vscode.window.onDidChangeVisibleTextEditors(
      (event) => {
        if (!event.find((editor) => editor === this._editor)) {
          this.destroy();
        }
      }
    );

    if (this._awareness) {
      vscode.window.onDidChangeTextEditorSelection((event) => {
        if (event.textEditor !== this._editor) {
          return;
        }

        const selection = this._editor.selection;
        let anchor = this._editor.document.offsetAt(selection.start);
        let head = this._editor.document.offsetAt(selection.end);
        if (selection.isReversed) {
          const tmp = anchor;
          anchor = head;
          head = tmp;
        }

        this._awareness?.setLocalStateField("selection", {
          anchor: Y.createRelativePositionFromTypeIndex(this._ytext, anchor),
          head: Y.createRelativePositionFromTypeIndex(this._ytext, head),
        });
      }, this);

      this._awareness.on("change", this._rerenderDecorationsHandler);
    }
  }

  private _rerenderDecorations() {
    if (!this._awareness) {
      return;
    }

    const states = this._awareness.getStates();

    for (const [clientID, decorations] of this._decorations.entries()) {
      if (!states.has(clientID)) {
        this._editor.setDecorations(decorations[0], []);
        this._editor.setDecorations(decorations[1], []);
      }
    }

    states.forEach((state, clientID) => {
      if (
        clientID !== this._ydoc.clientID &&
        state.selection &&
        state.selection.anchor &&
        state.selection.head
      ) {
        const anchorAbsolute = Y.createAbsolutePositionFromRelativePosition(
          state.selection.anchor,
          this._ydoc
        );
        const headAbsolute = Y.createAbsolutePositionFromRelativePosition(
          state.selection.head,
          this._ydoc
        );

        if (
          anchorAbsolute !== null &&
          headAbsolute !== null &&
          anchorAbsolute.type === this._ytext &&
          headAbsolute.type === this._ytext
        ) {
          const start = this._editor.document.positionAt(anchorAbsolute.index);
          const end = this._editor.document.positionAt(headAbsolute.index);

          let decorations = this._decorations.get(clientID);
          if (!decorations) {
            const color =
              "#" + Math.floor(Math.random() * 16777215).toString(16);
            decorations = [
              vscode.window.createTextEditorDecorationType({
                border: `${color} solid 2px`,
              }),
              vscode.window.createTextEditorDecorationType({
                after: {
                  contentText: `- ${this._ydoc.clientID}`,
                  color,
                  margin: "0.5rem",
                },
              }),
            ];
            this._decorations.set(clientID, decorations);
          }

          this._editor.setDecorations(decorations[0], [
            new vscode.Range(start, end),
          ]);
          this._editor.setDecorations(decorations[1], [
            new vscode.Range(
              this._editor.document.lineAt(start.line).range.end,
              this._editor.document.lineAt(start.line).range.end
            ),
          ]);
        }
      }
    });
  }

  private async _ytextObserver(
    event: Y.YTextEvent,
    transaction: Y.Transaction
  ) {
    const delta = event.delta;
    if (transaction.local) {
      return;
    }
    console.log(delta, this._ytext.toJSON());
    this._numberOfSyncOperations++;
    const release = await this._mutex.acquire();

    try {
      let index = 0;
      await this._editor.edit((builder) => {
        const document = this._editor.document;
        delta.forEach((op) => {
          if (op.retain !== undefined) {
            index += op.retain;
          } else if (op.insert !== undefined) {
            const pos = document.positionAt(index);
            console.log(index, pos);
            const insert = op.insert as string;
            builder.insert(pos, insert);
          } else if (op.delete !== undefined) {
            const pos = document.positionAt(index);
            const endPos = document.positionAt(index + op.delete);
            const selection = new vscode.Selection(pos, endPos);
            builder.delete(selection);
          } else {
            throw error.unexpectedCase();
          }
        });
      });

      this._rerenderDecorations();
    } finally {
      release();
      this._numberOfSyncOperations--;
    }
  }

  public destroy() {
    this._changeHandler.dispose();
    this._closeHandler.dispose();
    this._ytext.unobserve(this._ytextObserverHandler);
    if (this._awareness) {
      this._awareness.off("change", this._rerenderDecorationsHandler);
    }
    this._decorations.forEach((decorations) => {
      this._editor.setDecorations(decorations[0], []);
      this._editor.setDecorations(decorations[1], []);
    });
  }
}
