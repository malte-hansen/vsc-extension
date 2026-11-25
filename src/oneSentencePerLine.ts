import * as vscode from "vscode";
import { isMarkdown } from "./documents";
import { findTableLines } from "./markdownTables";
import { findContinuations, isHeading } from "./paragraphs";
import { endsSentence, findSentenceGaps } from "./sentenceBreaks";

/**
 * Puts each sentence on its own line, within the selected text or, if nothing
 * is selected, the whole document. Markdown tables and headings are left
 * unchanged, as a table row or heading has to stay on one line.
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
  const lines = document.getText().split(/\r?\n/);
  const tableLines = findTableLines(lines);
  // In other languages, such as source code, line breaks are significant.
  const isProse = isMarkdown(document) || document.languageId === "plaintext";
  const continuations = isProse
    ? findContinuations(lines)
    : new Map<number, number>();
  // The start of a line to repeat when splitting it.
  const prefix = isProse ? /^(?:\s*>)*\s*/ : /^\s*/;

  for (const range of ranges) {
    const lastLine = Math.min(range.end.line, document.lineCount - 1);
    for (let i = range.start.line; i <= lastLine; i++) {
      if (
        tableLines.has(i) ||
        (isMarkdown(document) && isHeading(lines[i] ?? ""))
      ) {
        continue;
      }
      // Inspect the full line, so that a selection starting or ending inside
      // it does not hide its indentation or list marker.
      const line = document.lineAt(i);
      const indent = prefix.exec(line.text)?.[0] ?? "";
      for (const { start, end } of findSentenceGaps(line.text)) {
        const gap = new vscode.Range(i, start, i, end);
        if (range.contains(gap)) {
          edit.replace(gap, end === line.text.length ? "" : eol + indent);
        }
      }

      const nextStart = continuations.get(i + 1);
      const text = line.text.trimEnd();
      if (nextStart !== undefined && !endsSentence(text)) {
        const gap = new vscode.Range(i, text.length, i + 1, nextStart);
        if (range.contains(gap)) {
          edit.replace(gap, " ");
        }
      }
    }
  }
}
