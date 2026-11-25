import type { TextDocument } from "vscode";

export function isMarkdown({ languageId, uri }: TextDocument): boolean {
  // Files such as "*.prompt.md" have a language of their own.
  return languageId === "markdown" || uri.path.endsWith(".md");
}
