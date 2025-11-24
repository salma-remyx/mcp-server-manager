# Main Menu

The main menu is the default screen when you launch the TUI.

## Launch

```bash
mcpsm
```

## Layout

```
📦 MCP Server Manager (port 8080)
   Total tools: 19/24 enabled · 12.5k tokens
   Unknown: 1 server not yet tested

Navigate: ↑/↓  |  Select: SPACE  |  Start: ENTER
T: Tools  |  X: Test  |  S: Scan  |  A: Add  |  D: Delete  |  E: Edit  |  L: Login  |  P: Port
C: Clients  |  F: Profiles  |  I: Import/Export  |  G: Settings  |  Q: Quit

Local Servers (STDIO):
→ ☑ filesystem     ✔ 11 tools · 4.2k
  ☑ github         ✔ 8 tools · 3.1k
  ☐ postgres       ? unknown

Remote Servers (HTTP/SSE):
  ☑ my-api [HTTP]  ✔ 5 tools · 5.2k
```

## Header

Shows:

- **Port** - Gateway port number
- **Total tools** - Enabled/total across all servers
- **Tokens** - Total token count for all enabled tools
- **Unknown** - Servers not yet tested

## Server List

### Local Servers (STDIO)

Local servers run as child processes via commands like `npx`, `uvx`, or direct binaries.

### Remote Servers (HTTP/SSE)

Remote servers connect over HTTP or Server-Sent Events (SSE).

## Server Status Indicators

| Indicator          | Meaning                          |
| ------------------ | -------------------------------- |
| `→`                | Currently selected (cursor)      |
| `☑`               | Selected for starting            |
| `☐`                | Not selected                     |
| `✔ N tools`       | Server tested, N tools available |
| `? unknown`        | Not yet tested                   |
| `✘ failed`         | Test failed                      |
| `🔒 auth required` | Needs authentication             |

## Navigation

| Key       | Action                  |
| --------- | ----------------------- |
| `↑` / `k` | Move cursor up          |
| `↓` / `j` | Move cursor down        |
| `SPACE`   | Toggle server selection |
| `ENTER`   | Start selected servers  |

## Server Actions

| Key | Action                            |
| --- | --------------------------------- |
| `A` | Add new server                    |
| `D` | Delete current server             |
| `E` | Edit current server (remote only) |
| `T` | Configure tool filters            |
| `L` | Login/authenticate (remote only)  |

## Global Actions

| Key | Action              |
| --- | ------------------- |
| `X` | Test all servers    |
| `S` | Scan/discover tools |
| `P` | Change gateway port |
| `Q` | Quit                |

## Screen Navigation

| Key | Screen                                        |
| --- | --------------------------------------------- |
| `C` | [Clients](tui/screens.md#clients)             |
| `F` | [Profiles](tui/screens.md#profiles)           |
| `I` | [Import/Export](tui/screens.md#import-export) |
| `G` | [Settings](tui/screens.md#settings)           |

## Starting Servers

1. Use `↑`/`↓` to navigate
2. Press `SPACE` to select servers
3. Press `ENTER` to start

Selected servers will run the gateway on the configured port.

## Selection Persistence

Your server selection is saved automatically. Next time you launch:

- Previously selected servers remain selected
- Cursor position is restored
