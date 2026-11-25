import * as assert from "node:assert/strict";
import * as vscode from "vscode";

async function format(
  lines: string[],
  {
    selections = [new vscode.Selection(0, 0, 0, 0)],
    language = "markdown",
  } = {},
): Promise<string[]> {
  const document = await vscode.workspace.openTextDocument({
    language,
    content: lines.join("\n"),
  });
  const editor = await vscode.window.showTextDocument(document);
  editor.selections = selections;
  await vscode.commands.executeCommand("vsc-extension.formatMarkdownTable");
  return document.getText().split("\n");
}

const TABLE = ["|a|b|", "|-|-|", "|long|x|"];
const FORMATTED = ["| a    | b   |", "| ---- | --- |", "| long | x   |"];

suite("Format Markdown table", () => {
  teardown(() =>
    vscode.commands.executeCommand("workbench.action.closeAllEditors"),
  );

  const cases: [name: string, input: string[], expected: string[]][] = [
    [
      "formats the example",
      [
        "|Metric key|Attached to|   Meaning|",
        "|-|-|-|",
        "|`cyclomatic_complexity`|function|Cyclomatic complexity|",
        "|  `cyclomatic_complexity_weighted`  |  class, file  |  Average per function, 0 without functions  |",
        "| `LCOM4` | class | Number of unrelated groups of methods |",
      ],
      [
        "| Metric key                       | Attached to | Meaning                                   |",
        "| -------------------------------- | ----------- | ----------------------------------------- |",
        "| `cyclomatic_complexity`          | function    | Cyclomatic complexity                     |",
        "| `cyclomatic_complexity_weighted` | class, file | Average per function, 0 without functions |",
        "| `LCOM4`                          | class       | Number of unrelated groups of methods     |",
      ],
    ],
    ["keeps formatted tables", FORMATTED, FORMATTED],
    [
      "shrinks columns",
      ["| a      | b |", "| ------ | --------- |", "| long   | x    |"],
      FORMATTED,
    ],
    [
      "formats all tables",
      ["Text", ...TABLE, "", "# A | B", ...TABLE],
      ["Text", ...FORMATTED, "", "# A | B", ...FORMATTED],
    ],
    [
      "ends a table at another block",
      [...TABLE, "> a | b", "", ...TABLE, "- a | b"],
      [...FORMATTED, "> a | b", "", ...FORMATTED, "- a | b"],
    ],
    ["adds outer separators", ["a|b", "-|-", "long|x"], FORMATTED],
    [
      "keeps the rendered alignment",
      ["|a|b|c|", "|:-|:-:|-:|", "|long|long|long|"],
      [
        "| a    | b    | c    |",
        "| :--- | :--: | ---: |",
        "| long | long | long |",
      ],
    ],
    [
      "keeps escaped separators",
      ["|a|b|", "|-|-|", "|`x \\| y`|\\\\|"],
      ["| a        | b   |", "| -------- | --- |", "| `x \\| y` | \\\\  |"],
    ],
    [
      "keeps empty, missing, and extra cells",
      ["||b|", "|-|-|", "|||", "|x|", "||y|", "|1|2|3|"],
      [
        "|     | b   |",
        "| --- | --- |",
        "|     |     |",
        "| x   |     |",
        "|     | y   |",
        "| 1   | 2   | 3   |",
      ],
    ],
    [
      "formats a single column",
      ["|a|", "|-|", "|long|"],
      ["| a    |", "| ---- |", "| long |"],
    ],
    [
      "aligns wide and combined characters",
      ["|a|b|", "|-|-|", "|日本|✅|", "|u\u0308ber|ü|"],
      [
        "| a    | b   |",
        "| ---- | --- |",
        "| 日本 | ✅  |",
        "| u\u0308ber | ü   |",
      ],
    ],
    [
      "keeps the indentation in lists",
      ["1. Item", "", ...TABLE.map((row) => `    ${row}`)],
      ["1. Item", "", ...FORMATTED.map((row) => `    ${row}`)],
    ],
  ];
  for (const [name, input, expected] of cases) {
    test(name, async () => {
      assert.deepEqual(await format(input), expected);
      assert.deepEqual(await format(expected), expected);
    });
  }

  const unchanged: [name: string, input: string[]][] = [
    ["an empty file", [""]],
    ["text without a delimiter row", ["|a|b|", "|c|d|"]],
    ["separators without cells", ["|", "|"]],
    ["mismatched delimiter rows", ["|a|b|", "|-|"]],
    ["headings", ["a", "---", "b|c"]],
    ["fenced code", ["```md", ...TABLE, "```"]],
    ["nested fences", ["~~~~", "~~~", "```", ...TABLE, "~~~~"]],
    ["indented code", ["Text", "", ...TABLE.map((row) => `    ${row}`)]],
    ["block quotes", TABLE.map((row) => `> ${row}`)],
  ];
  for (const [name, input] of unchanged) {
    test(`does not change ${name}`, async () => {
      assert.deepEqual(await format(input), input);
    });
  }

  test("formats tables after code blocks", async () => {
    assert.deepEqual(await format(["```", ...TABLE, "```", ...TABLE]), [
      "```",
      ...TABLE,
      "```",
      ...FORMATTED,
    ]);
  });

  test("formats only the selected tables, as a whole", async () => {
    const selections = [
      new vscode.Selection(5, 0, 5, 2),
      new vscode.Selection(10, 1, 9, 0),
    ];
    assert.deepEqual(
      await format([...TABLE, "", ...TABLE, "", ...TABLE], { selections }),
      [...TABLE, "", ...FORMATTED, "", ...FORMATTED],
    );
  });

  test("ignores a table the selection only borders on", async () => {
    const selections = [new vscode.Selection(0, 0, 4, 0)];
    assert.deepEqual(await format([...TABLE, "", ...TABLE], { selections }), [
      ...FORMATTED,
      "",
      ...TABLE,
    ]);
  });

  test("does not change other languages", async () => {
    assert.deepEqual(await format(TABLE, { language: "plaintext" }), TABLE);
  });

  test("keeps the line endings and is undone in one step", async () => {
    const content = TABLE.join("\r\n");
    const document = await vscode.workspace.openTextDocument({
      language: "markdown",
      content,
    });
    await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand("vsc-extension.formatMarkdownTable");
    assert.equal(document.getText(), FORMATTED.join("\r\n"));
    await vscode.commands.executeCommand("undo");
    assert.equal(document.getText(), content);
  });
});
