# Changelog

All notable changes to MCP Server Manager are documented here.

## [1.1.0] - 2024-11

### Major Changes

This release introduces a **gateway pattern** for client connections, simplifying how servers are managed across multiple AI clients.

### Features

#### Gateway Pattern (v1.1)

- **New Architecture**: Moved from syncing individual servers to each client to a single gateway server pattern
- Single `mcpsm` gateway server per client that proxies all requests to the daemon
- All your servers are now automatically accessible through this gateway
- Eliminated redundant per-client server copies

#### 3-State Connection Model (v1.1)

- New connection states: **Connected** | **Disconnected** | **Not Installed**
- Simple `connect` / `disconnect` workflow
- Clients are either fully connected to the gateway or not
- Clear status indication for each client

#### Automatic Port Updates (v1.1)

- When gateway port changes, all connected clients are automatically updated
- Port updates reflected in both primary and real-time config paths
- No manual client configuration editing needed
- Real-time clients (Cursor, Windsurf, VS Code) see changes immediately

#### Real-Time Config Loading (v1.1)

- Support for clients that load config without restart
- Separate real-time config paths:
  - Cursor: `~/.cursor/mcp.json`
  - Windsurf: `~/.windsurf/mcp.json`
  - VS Code: `~/.continue/mcp.json`
  - Claude: `~/.claude/mcp.json`
- mcpsm writes to both primary config and real-time path for consistency

#### Simplified TUI (v1.1)

- Removed redundant keybindings (P for port, M for daemon)
- Clarified keyboard shortcuts and actions
- Streamlined menu with focused functionality
- Dedicated Clients screen for connection management
- Settings screen now handles port changes with automatic client updates

### API Changes

#### Client Connection (Breaking)

**Before (v1.0):**

```bash
mcpsm clients sync <client>      # Complex sync process
mcpsm clients enable <client>    # Enable individual server in client
```

**After (v1.1):**

```bash
mcpsm clients connect <client>   # Simple connection
mcpsm clients disconnect <client> # Simple disconnection
```

#### Removed Features

- Client sync model (individual server sync)
- Server enable/disable per-client
- Auto-sync settings
- Server state persistence per client

#### New Client Commands

- `mcpsm clients connect <id>` - Connect client to gateway
- `mcpsm clients disconnect <id>` - Disconnect client from gateway
- `mcpsm clients open <id>` - Open client config in editor

### Type System Changes

#### Removed Types

- `ClientsState` - No longer needed (3-state model replaces it)
- `SyncResult` - Simplified to connection status
- `ClientSyncResult` - Replaced with `DetectedClient`
- `EnabledTools` - Tool filters now per-server

#### New Types

- `ClientStatus` - Union: `'connected' | 'disconnected' | 'not-installed'`
- `DetectedClient` - Client info with status
- `ClientPathsConfig` - Platform-specific config paths

### Configuration Changes

#### settings.json Structure

**Before (v1.0):**

```json
{
  "port": 8080,
  "autoSync": true,
  "autoTest": false,
  "editor": "code",
  "theme": "default"
}
```

**After (v1.1):**

```json
{
  "port": 8850,
  "editor": "code",
  "theme": "default",
  "profile": null
}
```

#### Default Port Changed

- Old default: `8080`
- New default: `8850`

### Client Configuration

#### Connection Entry Format

When a client connects, this entry is added to its config:

```json
{
  "mcpsm": {
    "command": "npx",
    "args": ["-y", "supergateway", "--streamableHttp", "http://localhost:PORT/mcp"]
  }
}
```

#### Preserved Servers

- Existing servers in client config are preserved when connecting
- Only the `mcpsm` gateway entry is managed by mcpsm
- Disconnecting removes only the `mcpsm` entry

### Documentation Updates

#### New Guides

- `docs/guide/architecture.md` - Gateway pattern and 3-state model
- `docs/guide/client-connections.md` - Detailed connection guide
- `docs/CHANGELOG.md` - This file

#### Updated Guides

- `docs/guide/getting-started.md` - Gateway pattern focus
- `docs/guide/configuration.md` - Client config paths and real-time loading
- `docs/cli/daemon.md` - Daemon and gateway relationship
- `docs/cli/clients.md` - New connect/disconnect workflow

### Test Coverage

- 366 total tests
- 100% CLI/TUI parity
- All gateway pattern features tested
- Port update automation tested
- Real-time config path support tested

### Migration from v1.0

If upgrading from v1.0, no action is required for your server definitions. However, client connections work differently:

#### v1.0 Model (Not Supported Anymore)

Individual servers were synced to each client's configuration. Changing a server required updating all connected clients.

#### v1.1 Model (New Approach)

All clients connect to a single `mcpsm` gateway server. Servers are managed centrally and automatically available everywhere.

**To migrate:**

1. Run `mcpsm` and connect your clients: `mcpsm clients connect claude`
2. Your existing servers are still configured in `~/.mcp-manager/config.json`
3. They're now accessible through all connected clients automatically

### Bug Fixes

- Fixed client detection on macOS to check for application bundles
- Improved config file writing with proper error handling
- Fixed path creation for new config files

### Performance

- Reduced TUI menu rendering time by removing redundant screens
- Simplified client detection logic
- Faster port update propagation

### Platform Support

| Platform | Status | Notes                                                   |
| -------- | ------ | ------------------------------------------------------- |
| macOS    | ✓ Full | All clients supported, real-time loading tested         |
| Windows  | ✓ Full | All clients supported                                   |
| Linux    | ✓ Full | Real-time clients (Cursor, Windsurf, VS Code) supported |

### Known Limitations

- Claude Desktop and some other clients require restart to pick up client config changes (real-time loading not supported)
- Codex CLI uses TOML format instead of JSON (supported but different format)

---

## [1.0.0] - 2024-10

### Initial Release

First stable release of MCP Server Manager with full TUI and CLI support.

#### Features

- Interactive TUI for managing MCP servers
- CLI commands for scripting and automation
- Support for local STDIO servers
- Support for remote HTTP and SSE servers
- Server testing and health checks
- Tool enable/disable per server
- Server profiles for different contexts
- Import/export functionality
- Daemon mode with auto-start
- Token counting and usage tracking

#### Supported Clients

- Claude Desktop
- Cursor
- Windsurf
- VS Code (Continue extension)
- Claude Code CLI
- Codex CLI
- Gemini CLI

#### Configuration

- Server definitions in `~/.mcp-manager/config.json`
- Per-server tool filters
- Application settings (port, editor, theme)
- Server profiles

#### Testing

- Server health checks
- Tool discovery
- Parallel testing
- JSON output support

---

## Upgrading

### From v1.0 to v1.1

This is a major architectural change. While server definitions remain the same, client connections work completely differently.

**Important Changes:**

- Sync model → Gateway pattern
- Multiple client config entries per server → Single gateway entry
- Per-client server management → Centralized gateway management

**Action Required:**

1. Connect your clients using the new workflow
2. All existing servers remain configured and will be automatically available

**Benefits:**

- Much simpler to manage
- Automatic server propagation to all clients
- Single port configuration point
- Real-time updates for compatible clients

---

## Roadmap

Future planned features:

- OAuth 2.0 support improvements
- Additional client support
- Advanced profiling and monitoring
- Caching and performance optimizations
- Cloud configuration sync
