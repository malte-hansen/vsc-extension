import * as assert from "node:assert/strict";
import * as vscode from "vscode";

async function format(
  content: string,
  ...selections: vscode.Selection[]
): Promise<string> {
  return formatLanguage("markdown", content, ...selections);
}

async function formatLanguage(
  language: string,
  content: string,
  ...selections: vscode.Selection[]
): Promise<string> {
  const document = await vscode.workspace.openTextDocument({
    language,
    content,
  });
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
    ["joins lines", "One\nhalf\n  more.\nTwo\nx.", "One half more.\nTwo x."],
    ["joins lines with CRLF", "One \r\nhalf. X.", "One half.\r\nX."],
    ["joins after an abbreviation", "Use e.g.\nthis.", "Use e.g. this."],
    ["joins list items", "- A\n  b. C.\n- D\ne.", "- A b.\n  C.\n- D e."],
    [
      "joins nested lists",
      "1. A\n   - b\n     c\n2. d",
      "1. A\n   - b c\n2. d",
    ],
    ["joins block quotes", "> A\n> b.\n>\n> C\n> d.", "> A b.\n>\n> C d."],
    [
      "keeps quote markers",
      "> A. B\n> c.\n>> D. E.",
      "> A.\n> B c.\n>> D.\n>> E.",
    ],
    ["joins footnotes", "[^1]: A\n    b.\n[^2]: C.", "[^1]: A b.\n[^2]: C."],
    [
      "joins lines starting with inline HTML",
      "A\n<kbd>b</kbd>\nc.",
      "A <kbd>b</kbd> c.",
    ],
    [
      "joins lines starting with a link",
      "See\n<https://a.b>\nor\n[c](d).",
      "See <https://a.b> or [c](d).",
    ],
    [
      "joins text between code blocks",
      "```\na\nb\n```\nC\nd.",
      "```\na\nb\n```\nC d.",
    ],
    ["removes spaces after the last sentence", "One. Two. ", "One.\nTwo."],
    ["keeps the indentation", "\t One. Two.", "\t One.\n\t Two."],
    ["keeps the line endings", "One. Two.\r\nX.", "One.\r\nTwo.\r\nX."],
    ["ignores dots inside words", "Pi is 3.14 in a.txt", "Pi is 3.14 in a.txt"],
    ["ignores list markers", "1. One. Two.\n2. X", "1. One.\nTwo.\n2. X"],
    ["ignores abbreviations", "Ask Dr. No, e.g. now.", "Ask Dr. No, e.g. now."],
    ["splits after a number", "It was 1999. Then.", "It was 1999.\nThen."],
    ["handles an empty file", "", ""],
    [
      "ignores Markdown tables",
      "A. B.\n\n| A. B. | C |\n|---|---|\n| D. E.  | F. |\n\nG. H.",
      "A.\nB.\n\n| A. B. | C |\n|---|---|\n| D. E.  | F. |\n\nG.\nH.",
    ],
    [
      "ignores Markdown tables in block quotes",
      "> A. B.\n>\n> | A. B. |\n> |---|\n> | C. D. |\n\n>> | a |\n>> |---|\n>> | E. F. |",
      "> A.\n> B.\n>\n> | A. B. |\n> |---|\n> | C. D. |\n\n>> | a |\n>> |---|\n>> | E. F. |",
    ],
    [
      "ignores Markdown tables with CRLF",
      "| A. B. |\r\n|---|\r\n| C. D. |",
      "| A. B. |\r\n|---|\r\n| C. D. |",
    ],
    ["ignores headings", "# 1. A. B\n\n> ## C. D", "# 1. A. B\n\n> ## C. D"],
    ["splits lines with pipes outside tables", "a | B. C.", "a | B.\nC."],
  ];
  for (const [name, input, expected] of cases) {
    test(name, async () => {
      assert.equal(await format(input), expected);
      assert.equal(await format(expected), expected);
    });
  }

  const unchanged: [name: string, input: string][] = [
    ["paragraphs", "A\n\nb"],
    ["finished sentences", 'A!\nB?\n"C."\n(D.)\n**E.**\nF.[^1]\nG'],
    ["headings", "# A\nb\n\nC\n===\nd\n\nE\n---\nf"],
    ["list items", "Text\n- a\n* b\n  + c\n1. d\n2) e\n- [ ] f"],
    ["thematic breaks", "a\n***\nb\n\n- - -\nc"],
    ["hard breaks", "a  \nb\\\nc<br>\nd"],
    ["fenced code", "```js\na\n\n    b\nc\n```\n\n~~~\n```\nd\ne\n~~~"],
    [
      "fenced code in lists",
      "- a\n  ```\n  b\n  c\n  ```\n- ```\n  d\n  e\n  ```",
    ],
    ["fenced code in block quotes", "> ```\n> a\n> b\n> ```"],
    ["indented code", "a\n\n    b\n    > c\n    > d\n\te"],
    ["indented code in lists", "1. a\n\n       b\n       c\n\n2. d"],
    ["block quotes of different depth", "a\n> b\n> > c\nd"],
    ["alerts", "> [!NOTE]\n> a"],
    [
      "HTML",
      "<div>\na\nb\n</div>\n\n<!--\nc\n\nd\ne\n-->\n\n<pre>\nf\n\ng\nh\n</pre>",
    ],
    ["HTML tags on their own line", '<a>\n<img>\n</a>\n\n<img\n  src="a">'],
    ["math", "$$\na\nb\n$$\n\n$$c$$\nd"],
    ["front matter", "---\na: b\nc: d\n---\ne"],
    ["link definitions", '[a]: b\n[c]:d\n[e]: <f> "g h"'],
    ["tables", "a\n\nb | c\n--|--\nd | e\n\n| f |\n| g |"],
  ];
  for (const [name, input] of unchanged) {
    test(`does not join ${name}`, async () => {
      assert.equal(await format(input), input);
    });
  }

  test("joins lines in plain text", async () => {
    assert.equal(
      await formatLanguage("plaintext", "One\nhalf. Two."),
      "One half.\nTwo.",
    );
  });

  test("does not join lines in source code", async () => {
    assert.equal(
      await formatLanguage("javascript", "a()\nb()\n// C. D."),
      "a()\nb()\n// C.\nD.",
    );
  });

  test("joins only selected lines", async () => {
    assert.equal(
      await format("a\nb\nc\nd", new vscode.Selection(1, 0, 2, 1)),
      "a\nb c\nd",
    );
  });

  test("ignores a selection inside a Markdown table", async () => {
    const content = "| A. B. |\n|---|\n| C. D. |";
    assert.equal(
      await format(content, new vscode.Selection(2, 0, 2, 9)),
      content,
    );
  });

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
