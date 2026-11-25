import * as assert from "node:assert/strict";
import * as vscode from "vscode";

async function format(
  content: string,
  ...selections: vscode.Selection[]
): Promise<string> {
  const document = await vscode.workspace.openTextDocument({ content });
  const editor = await vscode.window.showTextDocument(document);
  editor.selections =
    selections.length > 0 ? selections : [new vscode.Selection(0, 0, 0, 0)];
  await vscode.commands.executeCommand("vsc-extension.oneSentencePerLine");
  return document.getText();
}

suite("One sentence per line", () => {
  teardown(() =>
    vscode.commands.executeCommand("workbench.action.closeAllEditors"),
  );

  const cases: [name: string, input: string, expected: string][] = [
    ["splits sentences", "One. Two.  Three.", "One.\nTwo.\nThree."],
    ["formats every line", "A. B.\n\nC. D.\n", "A.\nB.\n\nC.\nD.\n"],
    ["keeps formatted text", "One.\nTwo.\n", "One.\nTwo.\n"],
    ["does not join lines", "One\nhalf. Two.", "One\nhalf.\nTwo."],
    ["removes spaces after the last sentence", "One. Two. ", "One.\nTwo."],
    ["keeps the indentation", "\t One. Two.", "\t One.\n\t Two."],
    ["keeps the line endings", "One. Two.\r\nX.", "One.\r\nTwo.\r\nX."],
    ["ignores dots inside words", "Pi is 3.14 in a.txt", "Pi is 3.14 in a.txt"],
    ["ignores list markers", "1. One. Two.\n2. X", "1. One.\nTwo.\n2. X"],
    ["ignores abbreviations", "Ask Dr. No, e.g. now.", "Ask Dr. No, e.g. now."],
    ["splits after a number", "It was 1999. Then.", "It was 1999.\nThen."],
    ["handles an empty file", "", ""],
  ];
  for (const [name, input, expected] of cases) {
    test(name, async () => {
      assert.equal(await format(input), expected);
    });
  }

  test("formats only the selection", async () => {
    assert.equal(
      await format("A. B.\nC. D. E.\nF. G.", new vscode.Selection(1, 0, 1, 4)),
      "A. B.\nC.\nD. E.\nF. G.",
    );
  });

  test("formats a selection spanning lines, made backwards", async () => {
    assert.equal(
      await format("A. B. C.\nD. E. F.", new vscode.Selection(1, 4, 0, 4)),
      "A. B.\nC.\nD.\nE. F.",
    );
  });

  test("formats multiple selections", async () => {
    assert.equal(
      await format(
        "A. B.\nC. D.\nE. F.",
        new vscode.Selection(0, 0, 0, 5),
        new vscode.Selection(2, 0, 2, 5),
      ),
      "A.\nB.\nC. D.\nE.\nF.",
    );
  });

  test("uses the line's context for a partial selection", async () => {
    assert.equal(
      await format("  1. One. Two.", new vscode.Selection(0, 2, 0, 14)),
      "  1. One.\n  Two.",
    );
  });

  test("is undone in one step", async () => {
    const content = "One. Two. Three.";
    await format(content);
    await vscode.commands.executeCommand("undo");
    assert.equal(vscode.window.activeTextEditor?.document.getText(), content);
  });
});
