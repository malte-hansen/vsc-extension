import * as assert from "node:assert/strict";
import * as vscode from "vscode";

suite("Extension", () => {
  test("registers the helloWorld command", async () => {
    await vscode.commands.executeCommand("vsc-extension.helloWorld");
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("vsc-extension.helloWorld"));
  });
});
