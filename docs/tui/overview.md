# Main Menu

The main menu is the default screen when you launch the TUI.

## Launch

```bash
mcpsm
```

## Layout

```
MCP Server Manager v1.1.0

Profile: default | Port: 8850

┌─ Local Servers (STDIO) ────────────────────┐  ┌─ Shortcuts ────┐
│ → [✓] notion      - 19/19 tools           │  │ Navigation     │
│   [ ] metamcp     - 11/14 tools           │  │  ↑↓  Move      │
│                                            │  │ Spc  Select    │
└────────────────────────────────────────────┘  │ Ent  Manage    │
┌─ Remote Servers (HTTP/SSE) ────────────────┐  │ Q    Back      │
│   [ ] stripe      - 0/0 tools             │  │                │
│   [✓] deepwiki    - 3/3 tools             │  │ Server         │
│                                            │  │ A    Add       │
└────────────────────────────────────────────┘  │ E    Edit      │
                                                │ D    Delete    │
                                                │ N    Toggle    │
                                                │ X    Test      │
```

The main screen shows all configured servers with a consistent menu system for navigation and actions.

## Header

Shows:

- **App title** - "MCP Server Manager" with version
- **Profile** - Currently active profile
- **Port** - Gateway port number

## Server List

### Local Servers (STDIO)

Local servers run as child processes via commands like `npx`, `uvx`, or direct binaries.

### Remote Servers (HTTP/SSE)

Remote servers connect over HTTP or Server-Sent Events (SSE).

## Server Status Indicators

| Indicator     | Meaning                           |
| ------------- | --------------------------------- |
| `→`           | Currently selected (cursor)       |
| `[✓]`         | Server selected                   |
| `[ ]`         | Server not selected               |
| `19/19 tools` | Enabled/total tools for server    |
| `disabled`    | Server is disabled                |
| Gray text     | Server disabled or not yet tested |

## Navigation

| Key     | Action           |
| ------- | ---------------- |
| `↑` / ↓ | Move cursor      |
| `Space` | Toggle selection |
| `Enter` | Manage daemon    |
| `Q`     | Quit             |

## Server Actions

| Key | Action                            |
| --- | --------------------------------- |
| `A` | Add new server                    |
| `D` | Delete current server             |
| `E` | Edit current server (remote only) |
| `N` | Toggle server enabled/disabled    |
| `X` | Test all servers                  |

## Screen Navigation

| Key | Screen          |
| --- | --------------- |
| `T` | Tools           |
| `C` | Clients         |
| `F` | Profiles        |
| `G` | Settings        |
| `I` | Import/Export   |
| `H` | Doctor (health) |
| `K` | Tokens (usage)  |

## Menu System

Each screen features a consistent right-side menu panel with:

- **Navigation** - Movement and exit controls (↑/↓, Q)
- **Actions** - Screen-specific operations (varies per screen)
- **Data** - Access Tools, Profiles, Import/Export (T, F, I)
- **Config** - Access Clients, Settings (C, G)
- **System** - Access Doctor, Tokens (H, K)

The current screen is highlighted in the menu for easy reference.

## Selection Persistence

Your server selection is saved automatically. Next time you launch:

- Previously selected servers remain selected
- Cursor position is restored

## Sub-screens

From the main screen, you can access different management screens with consistent keyboard navigation:

- **Tools** (`T`) - Manage tool filtering per server
- **Clients** (`C`) - Connect/disconnect MCP clients
- **Profiles** (`F`) - Manage server profiles
- **Settings** (`G`) - Configure application settings
- **Import/Export** (`I`) - Import/export server configurations
- **Doctor** (`H`) - System health check
- **Tokens** (`K`) - View token usage statistics
