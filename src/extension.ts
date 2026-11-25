import * as vscode from "vscode";
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
  );
}

export function deactivate(): void {}
