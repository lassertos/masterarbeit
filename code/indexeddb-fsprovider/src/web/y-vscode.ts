// import * as Y from "yjs";
// import * as vscode from "vscode";
// import * as error from "lib0/error";
// import { createMutex } from "lib0/mutex";
// import { Awareness } from "y-protocols/awareness";

// class RelativeSelection {
//   start: Y.RelativePosition;
//   end: Y.RelativePosition;
//   isReversed: boolean;

//   constructor(
//     start: Y.RelativePosition,
//     end: Y.RelativePosition,
//     isReversed: boolean
//   ) {
//     this.start = start;
//     this.end = end;
//     this.isReversed = isReversed;
//   }
// }

// const createRelativeSelection = (
//   editor: vscode.TextEditor,
//   monacoModel: vscode.TextDocument,
//   type: Y.Text
// ) => {
//   const sel = editor.selection;
//   if (sel !== null) {
//     const startPos = sel.start;
//     const endPos = sel.end;
//     const start = Y.createRelativePositionFromTypeIndex(
//       type,
//       monacoModel.offsetAt(startPos)
//     );
//     const end = Y.createRelativePositionFromTypeIndex(
//       type,
//       monacoModel.offsetAt(endPos)
//     );
//     return new RelativeSelection(start, end, sel.isReversed);
//   }
//   return null;
// };

// const createMonacoSelectionFromRelativeSelection = (
//   editor: vscode.TextEditor,
//   type: Y.Text,
//   relSel: RelativeSelection,
//   doc: Y.Doc
// ) => {
//   const start = Y.createAbsolutePositionFromRelativePosition(relSel.start, doc);
//   const end = Y.createAbsolutePositionFromRelativePosition(relSel.end, doc);
//   if (
//     start !== null &&
//     end !== null &&
//     start.type === type &&
//     end.type === type
//   ) {
//     const model = editor.document;
//     const startPos = model.positionAt(start.index);
//     const endPos = model.positionAt(end.index);
//     return new vscode.Selection(
//       startPos.line,
//       startPos.character,
//       endPos.line,
//       endPos.character
//     ); // maybe isReversed needs to be taken into consideration
//   }
//   return null;
// };

// export class MonacoBinding {
//   doc: Y.Doc;
//   ytext: Y.Text;

//   monacoModel: vscode.TextDocument;
//   editors: Set<vscode.TextEditor>;
//   mux: ReturnType<typeof createMutex>;
//   awareness?: Awareness;
//   _savedSelections: Map<vscode.TextEditor, RelativeSelection>;
//   _beforeTransaction: () => void;
//   _decorations: Map<unknown, unknown>;
//   _rerenderDecorations: () => void;
//   _ytextObserver: (event: Y.YTextEvent) => void;
//   _monacoChangeHandler: vscode.Disposable;
//   _monacoDisposeHandler: vscode.Disposable;

//   constructor(
//     ytext: Y.Text,
//     monacoModel: vscode.TextDocument,
//     editors: Set<vscode.TextEditor> = new Set(),
//     awareness: Awareness | null = null
//   ) {
//     if (!ytext.doc) {
//       throw new Error("YText instance does not have an associated document!");
//     }
//     this.doc = ytext.doc;
//     this.ytext = ytext;
//     this.monacoModel = monacoModel;
//     this.editors = editors;
//     this.mux = createMutex();
//     this._savedSelections = new Map();
//     this._beforeTransaction = () => {
//       this.mux(() => {
//         this._savedSelections = new Map();
//         editors.forEach((editor) => {
//           if (editor.document === monacoModel) {
//             const rsel = createRelativeSelection(editor, monacoModel, ytext);
//             if (rsel !== null) {
//               this._savedSelections.set(editor, rsel);
//             }
//           }
//         });
//       });
//     };
//     this.doc?.on("beforeAllTransactions", this._beforeTransaction);
//     this._decorations = new Map();
//     this._rerenderDecorations = () => {
//       editors.forEach((editor) => {
//         if (awareness && editor.document === monacoModel) {
//           // render decorations
//           const currentDecorations = this._decorations.get(editor) || [];
//           /**
//            * @type {Array<monaco.editor.IModelDeltaDecoration>}
//            */
//           const newDecorations: vscode.DecorationOptions[] = [];
//           awareness.getStates().forEach((state, clientID) => {
//             if (
//               clientID !== this.doc?.clientID &&
//               state.selection != null &&
//               state.selection.anchor != null &&
//               state.selection.head != null
//             ) {
//               const anchorAbs = Y.createAbsolutePositionFromRelativePosition(
//                 state.selection.anchor,
//                 this.doc
//               );
//               const headAbs = Y.createAbsolutePositionFromRelativePosition(
//                 state.selection.head,
//                 this.doc
//               );
//               if (
//                 anchorAbs !== null &&
//                 headAbs !== null &&
//                 anchorAbs.type === ytext &&
//                 headAbs.type === ytext
//               ) {
//                 let start, end, afterContentClassName, beforeContentClassName;
//                 if (anchorAbs.index < headAbs.index) {
//                   start = monacoModel.positionAt(anchorAbs.index);
//                   end = monacoModel.positionAt(headAbs.index);
//                   afterContentClassName =
//                     "yRemoteSelectionHead yRemoteSelectionHead-" + clientID;
//                   beforeContentClassName = null;
//                 } else {
//                   start = monacoModel.positionAt(headAbs.index);
//                   end = monacoModel.positionAt(anchorAbs.index);
//                   afterContentClassName = null;
//                   beforeContentClassName =
//                     "yRemoteSelectionHead yRemoteSelectionHead-" + clientID;
//                 }
//                 vscode.window.createTextEditorDecorationType({});
//                 newDecorations.push({
//                   range: new vscode.Range(
//                     start.line,
//                     start.character,
//                     end.line,
//                     end.character
//                   ),
//                   renderOptions: {
//                     className: "yRemoteSelection yRemoteSelection-" + clientID,
//                     afterContentClassName,
//                     beforeContentClassName,
//                   },
//                 });
//               }
//             }
//           });
//           this._decorations.set(
//             editor,
//             editor.setDecorations(
//               { key: "yjs", dispose: () => undefined },
//               newDecorations
//             )
//           );
//         } else {
//           // ignore decorations
//           this._decorations.delete(editor);
//         }
//       });
//     };
//     /**
//      * @param {Y.YTextEvent} event
//      */
//     this._ytextObserver = (event) => {
//       this.mux(() => {
//         let index = 0;
//         event.delta.forEach((op) => {
//           if (op.retain !== undefined) {
//             index += op.retain;
//           } else if (op.insert !== undefined) {
//             const pos = monacoModel.getPositionAt(index);
//             const range = new monaco.Selection(
//               pos.lineNumber,
//               pos.column,
//               pos.lineNumber,
//               pos.column
//             );
//             const insert = /** @type {string} */ op.insert;
//             monacoModel.applyEdits([{ range, text: insert }]);
//             index += insert.length;
//           } else if (op.delete !== undefined) {
//             const pos = monacoModel.getPositionAt(index);
//             const endPos = monacoModel.getPositionAt(index + op.delete);
//             const range = new monaco.Selection(
//               pos.lineNumber,
//               pos.column,
//               endPos.lineNumber,
//               endPos.column
//             );
//             monacoModel.applyEdits([{ range, text: "" }]);
//           } else {
//             throw error.unexpectedCase();
//           }
//         });
//         this._savedSelections.forEach((rsel, editor) => {
//           const sel = createMonacoSelectionFromRelativeSelection(
//             editor,
//             ytext,
//             rsel,
//             this.doc
//           );
//           if (sel !== null) {
//             editor.selection = sel;
//           }
//         });
//       });
//       this._rerenderDecorations();
//     };
//     ytext.observe(this._ytextObserver);
//     {
//       const ytextValue = ytext.toString();
//       if (monacoModel.getText() !== ytextValue) {
//         vscode.window.visibleTextEditors
//           .find((editor) => editor.document.uri === monacoModel.uri)
//           ?.edit((builder) => {
//             builder.replace(
//               new vscode.Range(
//                 monacoModel.lineAt(0).range.start,
//                 monacoModel.lineAt(monacoModel.lineCount - 1).range.end
//               ),
//               ytextValue
//             );
//           });
//       }
//     }
//     this._monacoChangeHandler = vscode.workspace.onDidChangeTextDocument(
//       (event) => {
//         this.mux(() => {
//           this.doc.transact(() => {
//             Array.from(event.contentChanges)
//               .sort(
//                 (change1, change2) => change2.rangeOffset - change1.rangeOffset
//               )
//               .forEach((change) => {
//                 ytext.delete(change.rangeOffset, change.rangeLength);
//                 ytext.insert(change.rangeOffset, change.text);
//               }, this);
//           });
//         });
//       }
//     );
//     this._monacoDisposeHandler = vscode.workspace.onDidCloseTextDocument(
//       (event) => {
//         if (event.uri === monacoModel.uri) {
//           this.destroy();
//         }
//       }
//     );
//     if (awareness) {
//       editors.forEach((editor) => {
//         vscode.window.onDidChangeTextEditorSelection((t) => {
//           if (editor.document === monacoModel) {
//             const sel = editor.selection;
//             if (sel === null) {
//               return;
//             }
//             let anchor = monacoModel.offsetAt(sel.start);
//             let head = monacoModel.offsetAt(sel.end);
//             if (sel.isReversed) {
//               const tmp = anchor;
//               anchor = head;
//               head = tmp;
//             }
//             awareness.setLocalStateField("selection", {
//               anchor: Y.createRelativePositionFromTypeIndex(ytext, anchor),
//               head: Y.createRelativePositionFromTypeIndex(ytext, head),
//             });
//           }
//         });
//         awareness.on("change", this._rerenderDecorations);
//       });
//       this.awareness = awareness;
//     }
//   }

//   destroy() {
//     this._monacoChangeHandler.dispose();
//     this._monacoDisposeHandler.dispose();
//     this.ytext.unobserve(this._ytextObserver);
//     this.doc.off("beforeAllTransactions", this._beforeTransaction);
//     if (this.awareness) {
//       this.awareness.off("change", this._rerenderDecorations);
//     }
//   }
// }
