import * as vscode from "vscode";
import { formatMarkdownTable } from "./formatMarkdownTable";
import { oneSentencePerLine } from "./oneSentencePerLine";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("vsc-extension.helloWorld", () => {
      vscode.window.showInformationMessage("Hello World from Custom Scripts!");
    }),
    vscode.commands.registerTextEditorCommand(
      "vsc-extension.oneSentencePerLine",
      oneSentencePerLine,
    ),
    vscode.commands.registerTextEditorCommand(
      "vsc-extension.formatMarkdownTable",
      formatMarkdownTable,
    ),
  );
}

export function deactivate(): void {}
