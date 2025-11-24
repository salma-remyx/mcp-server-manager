# TUI Screens

Reference for all screens in the interactive TUI.

## Clients

**Shortcut:** `C`

Manage MCP client synchronization.

```
MCP Clients:

  1. Claude Desktop     ✔ Installed   SYNC: ON    (3 servers)
  2. Cursor            ✔ Installed   SYNC: OFF
  3. Windsurf          ✘ Not found
  4. VS Code           ✔ Installed   SYNC: ON    (3 servers)
  5. Claude Code       ✔ Installed   SYNC: OFF

  1-5: Toggle sync  |  S: Sync now  |  ESC: Back
```

### Features

- View all detected MCP clients
- See installation status
- Toggle sync per client
- View server count per client
- Sync all enabled clients at once

### Actions

| Key   | Action                      |
| ----- | --------------------------- |
| `1-6` | Toggle sync for client      |
| `S`   | Sync to all enabled clients |
| `ESC` | Return to main menu         |

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

  1. Gateway Port       8080
  2. Editor             code
  3. Auto-Sync          ON
  4. Auto-Test          OFF
  5. Theme              default
  6. Default Profile    (none)

  1-6: Edit  |  R: Reset All  |  ESC: Back
```

### Features

- View all settings
- Edit individual settings
- Toggle boolean settings
- Select from options (theme)
- Reset to defaults

### Settings

| Setting         | Type    | Description              |
| --------------- | ------- | ------------------------ |
| Gateway Port    | Number  | Port for gateway server  |
| Editor          | String  | Default editor command   |
| Auto-Sync       | Boolean | Sync clients on changes  |
| Auto-Test       | Boolean | Test servers on startup  |
| Theme           | Options | TUI color theme          |
| Default Profile | String  | Profile to load on start |

### Actions

| Key   | Action                |
| ----- | --------------------- |
| `1-6` | Edit setting          |
| `R`   | Reset all to defaults |
| `ESC` | Return to main menu   |

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
