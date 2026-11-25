import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("vsc-extension.helloWorld", () => {
      vscode.window.showInformationMessage("Hello World from Custom Scripts!");
    }),
  );
}

export function deactivate(): void {}
