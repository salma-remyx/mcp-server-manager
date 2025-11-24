# TUI Screens

Reference for all screens in the interactive TUI.

## Clients

**Shortcut:** `C`

Manage MCP client connections using the gateway pattern.

```
MCP Clients:

  → Claude Desktop     ✔ Installed   Connected
    Cursor            ✔ Installed   Disconnected
    Windsurf          ✘ Not installed
    VS Code           ✔ Installed   Connected
    Claude Code       ✘ Not installed

  ↑↓: Navigate  |  ENTER: Toggle Connect/Disconnect  |  O: Open Config  |  ESC: Back
```

### Features

- View all detected MCP clients
- See installation status (✔ Installed, ✘ Not installed)
- See connection status (Connected, Disconnected)
- Connect clients to add mcpsm gateway server
- Disconnect clients to remove gateway server
- Open client config files for manual editing
- Real-time status updates

### Gateway Pattern

When you connect a client:

- A single `mcpsm` server is added to the client's config
- This server proxies requests to `localhost:{port}/mcp`
- All your configured servers become accessible in that client
- Port changes automatically update all connected clients

### Actions

| Key     | Action                       |
| ------- | ---------------------------- |
| `↑/↓`   | Navigate between clients     |
| `ENTER` | Toggle connect/disconnect    |
| `O`     | Open client config in editor |
| `ESC`   | Return to main menu          |

### Status Meanings

- **Connected** - Client has mcpsm gateway server; can access all your servers
- **Disconnected** - Client is installed but not connected to mcpsm
- **Not installed** - Client application not found on system

---

## Profiles

**Shortcut:** `F`

Manage server profiles.

```
Profiles:

  1. work (active)     3 servers
  2. personal          2 servers
  3. project-x         5 servers
     (no profile)      all servers

  1-3: Switch  |  N: New  |  D: Delete  |  ESC: Back
```

### Features

- View all profiles
- See active profile
- View server count per profile
- Create new profiles
- Delete profiles
- Switch between profiles

### Actions

| Key   | Action              |
| ----- | ------------------- |
| `1-9` | Switch to profile   |
| `N`   | Create new profile  |
| `D`   | Delete profile      |
| `ESC` | Return to main menu |

---

## Import/Export

**Shortcut:** `I`

Import and export server configurations.

```
Import / Export:

  Import:
    1. Import from Claude Desktop
    2. Import from Cursor
    3. Import from JSON file

  Export:
    4. Export to JSON (MCPSM format)
    5. Export to JSON (Claude format)
    6. Preview export

  1-6: Select  |  ESC: Back
```

### Features

- Import from existing MCP clients
- Import from backup files
- Export in native or Claude format
- Preview export before saving

### Actions

| Key   | Action                     |
| ----- | -------------------------- |
| `1`   | Import from Claude Desktop |
| `2`   | Import from Cursor         |
| `3`   | Import from JSON file      |
| `4`   | Export to JSON (MCPSM)     |
| `5`   | Export to JSON (Claude)    |
| `6`   | Preview export             |
| `ESC` | Return to main menu        |

---

## Settings

**Shortcut:** `G`

Configure application settings.

```
Settings:

  → Port                8850
    Editor              code
    Theme               default
    Profile             (none)

  ↑↓: Navigate  |  ENTER: Edit  |  SPACE: Toggle (bool)  |  R: Reset All  |  ESC: Back
```

### Features

- View all application settings
- Edit individual settings by pressing ENTER
- Toggle boolean settings with SPACE
- Select from options (e.g., theme)
- Reset to defaults
- **Automatic port updates:** When port is changed, all connected clients are automatically updated

### Settings

| Setting | Type    | Description                                  |
| ------- | ------- | -------------------------------------------- |
| Port    | Number  | Gateway port (updates all connected clients) |
| Editor  | String  | Default editor command                       |
| Theme   | Options | TUI color theme                              |
| Profile | String  | Profile to load on start                     |

### Actions

| Key     | Action                |
| ------- | --------------------- |
| `↑/↓`   | Navigate settings     |
| `ENTER` | Edit selected setting |
| `SPACE` | Toggle boolean        |
| `R`     | Reset all to defaults |
| `ESC`   | Return to main menu   |

### Important: Port Changes

When you change the port setting:

- ✓ All connected clients are **automatically updated**
- ✓ The new port is written to each client's configuration
- ✓ No need to manually edit client configs
- ✓ Real-time loading clients (Cursor, Windsurf, VS Code) see changes without restart

---

## Tool Filters

**Shortcut:** `T` (from main menu)

Configure which tools are enabled per server.

```
Tool Filters for filesystem:

  [x] read_file           Read file contents         380 tokens
  [x] write_file          Write content to file      420 tokens
  [x] list_directory      List directory contents    350 tokens
  [ ] delete_file         Delete a file              300 tokens
  [ ] move_file           Move/rename a file         320 tokens
  [x] create_directory    Create new directory       280 tokens

  Enabled: 4/6 tools  |  Total: 1,430 tokens

  ↑↓: Navigate  |  SPACE: Toggle  |  A: All  |  N: None  |  ESC: Save
```

### Features

- View all available tools
- See tool descriptions
- See per-tool token counts
- Enable/disable individual tools
- Bulk enable/disable

### Actions

| Key       | Action              |
| --------- | ------------------- |
| `↑` / `↓` | Navigate tools      |
| `SPACE`   | Toggle current tool |
| `A`       | Enable all tools    |
| `N`       | Disable all tools   |
| `ESC`     | Save and return     |

---

## Add Server

**Shortcut:** `A` (from main menu)

Interactive prompts to add a new server.

```
Add New Server:

  Server name: my-server█

  Type: (use arrows)
    > stdio    Local process (command)
      http     Remote HTTP server
      sse      Remote SSE server

  Command: npx█
  Arguments: -y @modelcontextprotocol/server-example█
```

### Flow

1. Enter server name
2. Select server type
3. Enter command (STDIO) or URL (HTTP/SSE)
4. Enter arguments or token (optional)
5. Confirm

---

## Screen Flow

```
                    ┌─────────────┐
                    │  Main Menu  │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
     ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
     │  Clients  │   │ Profiles  │   │  Settings │
     │    (C)    │   │    (F)    │   │    (G)    │
     └───────────┘   └───────────┘   └───────────┘
           │
     ┌─────▼──────┐         ┌──────────────┐
     │  Import/   │         │ Tool Filters │
     │  Export(I) │         │     (T)      │
     └────────────┘         └──────────────┘
```
