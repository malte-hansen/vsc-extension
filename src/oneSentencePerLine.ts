import * as vscode from "vscode";
import { findSentenceGaps } from "./sentenceBreaks";

/**
 * Puts each sentence on its own line, within the selected text or, if nothing
 * is selected, the whole document.
 */
export function oneSentencePerLine(
  { document, selections }: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
): void {
  const selected = selections.filter((selection) => !selection.isEmpty);
  const ranges =
    selected.length > 0
      ? selected
      : [new vscode.Range(0, 0, document.lineCount, 0)];
  const eol = document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";

  for (const range of ranges) {
    const lastLine = Math.min(range.end.line, document.lineCount - 1);
    for (let i = range.start.line; i <= lastLine; i++) {
      // Inspect the full line, so that a selection starting or ending inside
      // it does not hide its indentation or list marker.
      const line = document.lineAt(i);
      const indent = line.text.slice(0, line.firstNonWhitespaceCharacterIndex);
      for (const { start, end } of findSentenceGaps(line.text)) {
        const gap = new vscode.Range(i, start, i, end);
        if (range.contains(gap)) {
          edit.replace(gap, end === line.text.length ? "" : eol + indent);
        }
      }
    }
  }
}
