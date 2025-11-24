# TUI + CLI Implementation Checklist

When implementing a new feature or modifying existing functionality in MCP Server Manager, you MUST update both interfaces.

## Checklist

For the feature: **$ARGUMENTS**

### 1. Shared Logic Module

- [ ] Identify or create the appropriate module in `src/` for business logic
- [ ] Ensure the function is exported and can be used by both CLI and TUI
- [ ] Keep I/O (prompts, console output) separate from core logic

### 2. CLI Implementation (`src/cli.js`)

- [ ] Add `cmd<Feature>()` function with proper argument parsing
- [ ] Add route in `runCli()` switch statement
- [ ] Support `--json` flag for machine-readable output where applicable
- [ ] Support `-y`/`--force` flag to skip confirmations where applicable
- [ ] Add help text in `showCliHelp()`

### 3. TUI Implementation

- [ ] Add keyboard shortcut in `src/index.js` if it's a main feature
- [ ] Or create/update `src/tui-<feature>.js` for complex flows
- [ ] Add keyboard hint in the appropriate menu render function
- [ ] Handle raw mode toggle properly (disable before prompts, re-enable after)

### 4. Testing

- [ ] Add tests in `tests/<module>.test.js`
- [ ] Test both CLI args parsing and core functionality

## File Reference

| Interface | File               | Pattern                                     |
| --------- | ------------------ | ------------------------------------------- |
| CLI       | `src/cli.js`       | `cmdFeature(options)` + route in `runCli()` |
| TUI Main  | `src/index.js`     | Keyboard handler in `handleKey()`           |
| TUI Sub   | `src/tui-*.js`     | `show*TUI()` exported function              |
| Logic     | `src/<feature>.js` | Pure functions, no I/O                      |

## Example: Adding "export" feature

1. **Logic** in `src/import-export.js`: `exportServers(format)`
2. **CLI** in `src/cli.js`: `cmdExport(options)` with `--format` flag
3. **TUI** in `src/tui-import-export.js`: `showImportExportTUI()` with export option
4. **Tests** in `tests/import-export.test.js`
