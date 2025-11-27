# Main Menu

The main menu is the default screen when you launch the TUI.

## Launch

```bash
mcpsm
```

## Layout

```
MCP Server Manager v2.2.2
Profile: default | Port: 8850 | Total: 8.6k tokens

Local Servers (STDIO):
→ ☑ filesystem ✔ 11 tools · 4.2k tokens
  ☑ github ✔ 8 tools · 3.1k tokens
  ☑ postgres ✔ 5 tools · 2.8k tokens

Remote Servers (HTTP/SSE):
  ☐ stripe - 0 tools
  ☑ deepwiki ✔ 3 tools · 284 tokens

↑/↓ Navigate SPACE Select A Add D Delete E Edit N Enable/Disable
X Test T Tools C Clients F Profiles G Settings M Daemon Q Quit
```

The main screen shows all configured servers with their tool counts and token usage at a glance. A single-line keyboard shortcut bar at the bottom provides quick access to all features.

## Header

Shows:

- **App title** - "MCP Server Manager" with version
- **Profile** - Currently active profile
- **Port** - Gateway port number
- **Total tokens** - Aggregate token usage across enabled servers

## Server List

### Local Servers (STDIO)

Local servers run as child processes via commands like `npx`, `uvx`, or direct binaries.

### Remote Servers (HTTP/SSE)

Remote servers connect over HTTP or Server-Sent Events (SSE).

## Server Status Indicators

| Indicator     | Meaning                           |
| ------------- | --------------------------------- |
| `→`           | Currently selected (cursor)       |
| `☑`          | Server selected/enabled           |
| `☐`           | Server not selected/disabled      |
| `✔`          | Server tested and working         |
| `11 tools`    | Number of available tools         |
| `4.2k tokens` | Estimated token usage             |
| Gray text     | Server disabled or not yet tested |

## Navigation

| Key       | Action                 |
| --------- | ---------------------- |
| `↑` / `↓` | Move between servers   |
| `Space`   | Toggle selection       |
| `Enter`   | Manage selected daemon |
| `Q`       | Quit / Go back         |

## Server Actions

| Key | Action                         |
| --- | ------------------------------ |
| `A` | Add new server                 |
| `D` | Delete selected server         |
| `E` | Edit server configuration      |
| `N` | Toggle server enabled/disabled |
| `X` | Test all servers               |

## Screen Navigation

| Key | Screen          |
| --- | --------------- |
| `T` | Tools           |
| `C` | Clients         |
| `F` | Profiles        |
| `G` | Settings        |
| `M` | Daemon          |
| `I` | Import/Export   |
| `H` | Doctor (health) |

## Menu System

The main screen displays a comprehensive keyboard shortcut bar at the bottom organized by function:

**Navigation & Selection:**

- `↑/↓` - Navigate between servers
- `SPACE` - Select/deselect server

**Server Operations:**

- `A` - Add new server
- `D` - Delete server
- `E` - Edit server
- `N` - Toggle enabled/disabled
- `X` - Test all servers

**Screen Navigation:**

- `T` - Tools
- `C` - Clients
- `F` - Profiles
- `G` - Settings
- `M` - Daemon
- `I` - Import/Export
- `H` - Doctor (health check)

**Exit:**

- `Q` - Quit

Each sub-screen features its own action-specific shortcuts while maintaining consistent navigation keys (`↑/↓`, `Q`).

## Selection Persistence

Your server selection is saved automatically. Next time you launch:

- Previously selected servers remain selected
- Cursor position is restored

## Sub-screens

From the main screen, you can access different management screens with consistent keyboard navigation:

- **Tools** (`T`) - Manage tool filtering per server and view per-tool token usage/totals
- **Clients** (`C`) - Connect/disconnect MCP clients
- **Profiles** (`F`) - Manage server profiles
- **Settings** (`G`) - Configure application settings
- **Import/Export** (`I`) - Import/export server configurations
- **Doctor** (`H`) - System health check
