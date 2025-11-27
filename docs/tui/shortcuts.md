# Keyboard Shortcuts

Complete reference of all keyboard shortcuts in the TUI.

## Global Shortcuts

Available on all screens:

| Key      | Action           |
| -------- | ---------------- |
| `Q`      | Quit application |
| `ESC`    | Go back / Cancel |
| `Ctrl+C` | Force quit       |

---

## Main Menu

### Navigation

| Key        | Action           |
| ---------- | ---------------- |
| `↑` or `k` | Move cursor up   |
| `↓` or `j` | Move cursor down |
| `ENTER`    | Manage server    |

### Server Actions

| Key     | Action                |
| ------- | --------------------- |
| `A`     | Add new server        |
| `D`     | Delete current server |
| `E`     | Edit server           |
| `SPACE` | Enable/disable server |
| `X`     | Test all servers      |

### Screen Navigation

| Key     | Screen        |
| ------- | ------------- |
| `T`     | Tools         |
| `C`     | Clients       |
| `F`     | Profiles      |
| `I`     | Import/Export |
| `G`     | Settings      |
| `H`     | Doctor        |
| `O`     | Auth (remote) |
| `ENTER` | Daemon        |

---

## Tool Filters Screen

| Key       | Action            |
| --------- | ----------------- |
| `↑` / `↓` | Navigate tools    |
| `SPACE`   | Toggle tool       |
| `A`       | Enable all tools  |
| `N`       | Disable all tools |
| `ESC`     | Save and return   |

---

## Clients Screen

| Key     | Action                                       |
| ------- | -------------------------------------------- |
| `↑/↓`   | Navigate between clients                     |
| `ENTER` | Toggle connect/disconnect for current client |
| `R`     | Refresh detected clients                     |
| `ESC`   | Return to main menu                          |

---

## Profiles Screen

| Key     | Action               |
| ------- | -------------------- |
| `↑/↓`   | Navigate profiles    |
| `ENTER` | Use selected profile |
| `N`     | Create new profile   |
| `D`     | Delete selected      |
| `ESC`   | Return to main menu  |

---

## Import/Export Screen

Navigate with `↑/↓` and select with `ENTER`. Options are dynamic based on installed clients (e.g., Import from Claude/Cursor/Windsurf/VS Code), plus import from file and export options.

---

## Settings Screen

| Key     | Action                    |
| ------- | ------------------------- |
| `↑/↓`   | Navigate between settings |
| `ENTER` | Edit selected setting     |
| `SPACE` | Toggle boolean setting    |
| `R`     | Reset all to defaults     |
| `ESC`   | Return to main menu       |

**Note:** When port is changed, all connected clients are automatically updated with the new port.

---

## Input Prompts

When entering text:

| Key         | Action           |
| ----------- | ---------------- |
| `ENTER`     | Confirm input    |
| `ESC`       | Cancel input     |
| `Backspace` | Delete character |

---

## Confirmation Dialogs

| Key            | Action  |
| -------------- | ------- |
| `Y` or `ENTER` | Confirm |
| `N` or `ESC`   | Cancel  |

---

## Quick Reference Card

```
╔════════════════════════════════════════════════════╗
║             MCP Server Manager Shortcuts           ║
╠════════════════════════════════════════════════════╣
║  Navigation      │  Server Actions                ║
║  ↑↓  Navigate    │  A  Add server                 ║
║  ENTER  Manage   │  D  Delete server              ║
║                  │  E  Edit server                ║
║  Screens         │  SPACE  Enable/Disable         ║
║  T  Tools        │  X  Test all                   ║
║  C  Clients      │                                ║
║  F  Profiles     │  System                        ║
║  I  Import/Exp   │  H  Doctor                     ║
║  G  Settings     │                                ║
║                  │  Q  Quit                       ║
╚════════════════════════════════════════════════════╝
```
