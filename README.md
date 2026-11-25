# Hansen's Code Extension

A Visual Studio Code extension providing custom scripts.

## Commands

### Format: One Sentence per Line

Moves every sentence that starts on the same line as another one to its own line, in the selected text or, if nothing is selected, the whole file.

A sentence ends with a `.` followed by whitespace, and that whitespace is removed. Ordered list markers (`1.`) and a few abbreviations (such as `e.g.` and `Dr.`) do not end a sentence. New lines keep the indentation of the original line, and existing line breaks are never removed. Markdown tables are left unchanged.

### Format Markdown Table

Available in Markdown files. Left-aligns the cells and vertically aligns the column separators of every table the selection touches or, if nothing is selected, all tables in the file.

Colons in the delimiter row (`:--`, `:-:`, `--:`) are kept, since they determine the alignment of the rendered table. Missing outer separators and cells are added. Tables in code blocks and block quotes are left unchanged.

## Development

Requires Node.js 24 or newer.

```sh
npm install
```

Press `F5` in VS Code to launch an Extension Development Host with the extension loaded. The default build task rebuilds on change.

| Script                      | Purpose                                         |
| --------------------------- | ----------------------------------------------- |
| `npm run build`             | Bundle the extension into `dist/` with esbuild  |
| `npm run watch`             | Rebuild on change                               |
| `npm run typecheck`         | Type-check with TypeScript                      |
| `npm run lint`              | Lint and check formatting with Biome            |
| `npm run format`            | Apply Biome fixes and formatting                |
| `npm test`                  | Run the integration tests in a VS Code instance |
| `npm run package`           | Build a `.vsix` package                         |
| `npm run install-extension` | Package and install into the local VS Code      |

Installing requires the `code` command on your `PATH`. Reload VS Code windows afterwards to pick up the new version.

## Layout

- `src/extension.ts` is the entry point; commands are declared under `contributes.commands` in `package.json`.
- `src/test/` holds integration tests, run by `@vscode/test-cli`.
