# Hansen's Code Extension

A Visual Studio Code extension providing custom scripts.

## Development

Requires Node.js 24 or newer.

```sh
npm install
```

Press `F5` in VS Code to launch an Extension Development Host with the extension loaded. The default build task rebuilds on change.

| Script              | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `npm run build`     | Bundle the extension into `dist/` with esbuild  |
| `npm run watch`     | Rebuild on change                               |
| `npm run typecheck` | Type-check with TypeScript                      |
| `npm run lint`      | Lint and check formatting with Biome            |
| `npm run format`    | Apply Biome fixes and formatting                |
| `npm test`          | Run the integration tests in a VS Code instance |
| `npm run package`   | Build a `.vsix` package                         |

## Layout

- `src/extension.ts` is the entry point; commands are declared under `contributes.commands` in `package.json`.
- `src/test/` holds integration tests, run by `@vscode/test-cli`.
