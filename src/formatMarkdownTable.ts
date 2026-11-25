import * as vscode from "vscode";
import { findTables, formatTable } from "./markdownTables";

/**
 * Formats the tables touched by the selection or, if nothing is selected, all
 * tables in the document.
 */
export function formatMarkdownTable(
  { document, selections }: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
): void {
  // Files such as "*.prompt.md" have a language of their own.
  if (
    document.languageId !== "markdown" &&
    !document.uri.path.endsWith(".md")
  ) {
    return;
  }

  const selected = selections.filter((selection) => !selection.isEmpty);
  const lines = Array.from(
    { length: document.lineCount },
    (_, i) => document.lineAt(i).text,
  );

  for (const table of findTables(lines)) {
    const { firstLine, rows } = table;
    const lastLine = firstLine + rows.length - 1;
    const range = new vscode.Range(
      document.lineAt(firstLine).range.start,
      document.lineAt(lastLine).range.end,
    );
    // Ranges that merely share an endpoint have an empty intersection.
    const isSelected = selected.some(
      (selection) => selection.intersection(range)?.isEmpty === false,
    );
    if (selected.length > 0 && !isSelected) {
      continue;
    }
    for (const [i, row] of formatTable(table).entries()) {
      const line = document.lineAt(firstLine + i);
      if (line.text !== row) {
        edit.replace(line.range, row);
      }
    }
  }
}
