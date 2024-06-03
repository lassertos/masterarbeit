import * as Y from "yjs";
import * as vscode from "vscode";
import * as error from "lib0/error";
import { Awareness } from "y-protocols/awareness"; // eslint-disable-line
import { Mutex } from "async-mutex";

class RelativeSelection {
  start: Y.RelativePosition;
  end: Y.RelativePosition;
  isReversed: boolean;

  constructor(
    start: Y.RelativePosition,
    end: Y.RelativePosition,
    isReversed: boolean
  ) {
    this.start = start;
    this.end = end;
    this.isReversed = isReversed;
  }
}

const createRelativeSelection = (editor: vscode.TextEditor, type: Y.Text) => {
  const sel = editor.selection;
  if (sel !== null) {
    const startPos = sel.start;
    const endPos = sel.end;
    const start = Y.createRelativePositionFromTypeIndex(
      type,
      editor.document.offsetAt(startPos)
    );
    const end = Y.createRelativePositionFromTypeIndex(
      type,
      editor.document.offsetAt(endPos)
    );
    return new RelativeSelection(start, end, sel.isReversed);
  }
  return null;
};

const createMonacoSelectionFromRelativeSelection = (
  editor: vscode.TextEditor,
  type: Y.Text,
  relativeSelection: RelativeSelection,
  doc: Y.Doc
) => {
  const start = Y.createAbsolutePositionFromRelativePosition(
    relativeSelection.start,
    doc
  );
  const end = Y.createAbsolutePositionFromRelativePosition(
    relativeSelection.end,
    doc
  );
  if (
    start !== null &&
    end !== null &&
    start.type === type &&
    end.type === type
  ) {
    const startPos = editor.document.positionAt(start.index);
    const endPos = editor.document.positionAt(end.index);
    return new vscode.Selection(startPos, endPos); // NOTE: maybe we need to consider isReversed property
  }
  return null;
};

export class VSCodeBinding {
  private _ytext: Y.Text;
  private _ydoc: Y.Doc;
  private _editor: vscode.TextEditor;
  private _awareness: Awareness | null;
  private _savedSelection?: RelativeSelection;
  private _mutex: Mutex;
  private _changeHandler: vscode.Disposable;
  private _closeHandler: vscode.Disposable;
  private _decorations: vscode.TextEditorDecorationType[] = [];

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
    this._decorations = [
      vscode.window.createTextEditorDecorationType({
        border: "orange solid 2px",
      }),
      vscode.window.createTextEditorDecorationType({
        after: {
          contentText: `- ${this._ydoc.clientID}`,
          color: "orange",
          margin: "0.5rem",
        },
      }),
    ];

    this._ydoc.on("beforeAllTransactions", this._beforeTransaction.bind(this));
    this._ytext.observe(this._ytextObserver.bind(this));

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
            event.document.getText() === this._ytext.toJSON()
          ) {
            console.log("ignoring same content");
            return;
          }

          console.log("processing content changes:", event.contentChanges);

          this._ydoc.transact(() => {
            Array.from(event.contentChanges)
              .sort(
                (change1, change2) => change2.rangeOffset - change1.rangeOffset
              )
              .forEach((change) => {
                console.log("processing:", change);
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
          this._destroy();
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

        this._awareness?.on("change", () => this._rerenderDecorations());
      }, this);
    }
  }

  private async _beforeTransaction() {
    const release = await this._mutex.acquire();

    try {
      const relativeSelection = createRelativeSelection(
        this._editor,
        this._ytext
      );
      if (relativeSelection !== null) {
        this._savedSelection = relativeSelection;
      }
    } finally {
      release();
    }
  }

  private _rerenderDecorations() {
    if (!this._awareness) {
      return;
    }

    this._awareness.getStates().forEach((state, clientID) => {
      if (
        clientID !== this._ydoc.clientID &&
        state.selection != null &&
        state.selection.anchor != null &&
        state.selection.head != null
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

          this._editor.setDecorations(this._decorations[0], [
            new vscode.Range(start, end),
          ]);
          this._editor.setDecorations(this._decorations[1], [
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
      console.log("ignoring local transaction");
      return;
    }
    const release = await this._mutex.acquire();

    try {
      let index = 0;
      await this._editor.edit((builder) => {
        delta.map((op) => {
          if (op.retain !== undefined) {
            index += op.retain;
          } else if (op.insert !== undefined) {
            const pos = this._editor.document.positionAt(index);
            const insert = op.insert as string;
            builder.insert(pos, insert);
            index += insert.length;
          } else if (op.delete !== undefined) {
            const pos = this._editor.document.positionAt(index);
            const endPos = this._editor.document.positionAt(index + op.delete);
            const selection = new vscode.Selection(pos, endPos);
            builder.delete(selection);
          } else {
            throw error.unexpectedCase();
          }
        });
      });
      if (this._savedSelection) {
        const selection = createMonacoSelectionFromRelativeSelection(
          this._editor,
          this._ytext,
          this._savedSelection,
          this._ydoc
        );
        if (selection !== null) {
          this._editor.selection = selection;
        }
      }

      this._rerenderDecorations();
    } finally {
      release();
    }
  }

  private _destroy() {
    this._changeHandler.dispose();
    this._closeHandler.dispose();
    this._ytext.unobserve(this._ytextObserver.bind(this));
    this._ydoc.off("beforeAllTransactions", this._beforeTransaction.bind(this));
    if (this._awareness) {
      this._awareness.off("change", this._rerenderDecorations);
    }
  }
}
