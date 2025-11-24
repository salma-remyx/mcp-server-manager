# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP Server Manager (`mcpsm`) is a CLI tool for managing MCP (Model Context Protocol) servers across multiple AI clients (Claude Desktop, Cursor, Windsurf, VS Code, etc.). It provides both an interactive TUI and CLI commands for server management, testing, client syncing, and daemon control.

### Client Connection Model

The system uses a **gateway pattern** for client connections:

- A single `mcpsm` server is added to each connected client's configuration
- This server uses `mcp-proxy` to proxy all MCP requests to the daemon on `localhost:{port}/mcp`
- When the port setting is changed, all connected clients are automatically updated
- Supports real-time config loading for clients without restart (Cursor, Windsurf, VS Code)

## Development Commands

```bash
# Build the TypeScript project
npm run build

# Run the CLI (after build)
npm start
node dist/cli/index.js <command>

# Development mode (with hot reload)
npm run dev              # CLI
npm run dev:tui          # TUI

# Type checking
npm run typecheck

# Linting
npm run lint             # Check for issues
npm run lint:fix         # Auto-fix issues

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report

# Formatting
npm run format           # Format code
npm run format:check     # Check formatting

# Clean build
npm run clean
```

## Architecture (TypeScript v2.0)

### Directory Structure

```
src/
├── types/              # TypeScript type definitions
│   ├── server.types.ts
│   ├── config.types.ts
│   ├── client.types.ts
│   ├── profile.types.ts
│   ├── settings.types.ts
│   ├── tool.types.ts
│   ├── auth.types.ts
│   ├── daemon.types.ts
│   ├── import-export.types.ts
│   ├── common.types.ts
│   └── index.ts        # Re-exports all types
├── services/           # Business logic services
│   ├── config.service.ts
│   ├── settings.service.ts
│   ├── profile.service.ts
│   ├── client.service.ts
│   ├── testing.service.ts
│   └── index.ts        # Re-exports all services
├── shared/             # Shared utilities
│   ├── colors.ts       # ANSI color codes
│   ├── logger.ts       # Logging utilities
│   ├── prompts.ts      # Interactive prompts
│   └── index.ts
├── cli/                # CLI implementation (commander.js)
│   ├── index.ts        # Main CLI entry point
│   └── commands/       # Command modules
│       ├── server.cmd.ts
│       ├── client.cmd.ts
│       ├── profile.cmd.ts
│       ├── settings.cmd.ts
│       ├── tools.cmd.ts
│       └── utility.cmd.ts
├── tui/                # TUI implementation
│   └── index.ts        # Main TUI entry point
└── index.ts            # Main exports
```

### Entry Points

- `bin/cli.js` - Entry point, routes to dist/ or src/ based on environment
- `dist/cli/index.js` - Built CLI (commander.js-based)
- `dist/tui/index.js` - Built TUI

### Services Layer

All business logic is encapsulated in singleton services:

- `ConfigService` - Configuration and server management
- `SettingsService` - Application settings
- `ProfileService` - Server profiles
- `ClientService` - MCP client detection and sync
- `TestingService` - Server health checks and tool discovery

### Configuration Files (in `~/.mcp-manager/`)

- `config.json` - Server configurations (local STDIO + remote HTTP/SSE)
- `tool-filters.json` - Per-server tool enable/disable settings
- `settings.json` - App settings (includes port configuration)
- `profiles.json` - Profile definitions

### Client Configuration Files

Each client has its own config location where the `mcpsm` gateway server is registered:

- **Claude Desktop**: `~/.claude/claude_desktop_config.json`
- **Cursor**: `~/.cursor/globalStorage/cursor.mcp/config.json` (with real-time: `~/.cursor/mcp.json`)
- **Windsurf**: `~/.config/Windsurf/User/globalStorage/windsurf.mcp/config.json` (with real-time: `~/.windsurf/mcp.json`)
- **VS Code (Continue)**: `~/.continue/config.json` (with real-time: `~/.continue/mcp.json`)
- **Claude Code**: `~/.claude/claude_code_config.json`
- **Codex CLI**: `~/.codex/config.toml`
- **Gemini CLI**: `~/.gemini/settings.json`

## Important: TUI + CLI Parity

**All features must be implemented in BOTH the TUI and CLI interfaces.** When adding or modifying functionality:

1. **Services**: Add/update business logic in `src/services/*.service.ts`
2. **CLI**: Add/update command in `src/cli/commands/*.cmd.ts`
3. **TUI**: Add/update screen in `src/tui/` or `src/tui/screens/`
4. **Features Registry**: Update `src/shared/features.ts` with the new feature

Both CLI and TUI should use the same services, ensuring consistent behavior.

### Parity Testing

Run `npm test` to check CLI/TUI parity status. The test will show:

- Which features are implemented in both interfaces
- Which features are missing from TUI
- Overall parity percentage

To enforce 100% parity, uncomment the final test in `tests/parity.test.ts`.

### Adding a New Feature

1. Add the feature definition to `src/shared/features.ts`:

```typescript
{
  id: "feature-id",
  name: "Human readable name",
  category: "servers", // or tools, clients, profiles, settings, daemon, import-export, utilities
  cliCommands: ["command-name"],
  tuiImplementation: "screen-file.ts", // or "key:x" for key binding, or null if not yet implemented
  requiredInTui: true,
}
```

2. Implement the CLI command in `src/cli/commands/*.cmd.ts`
3. Implement the TUI screen in `src/tui/screens/*.screen.ts` or add key binding in `src/tui/index.ts`
4. Run tests to verify parity: `npm test`

## Code Style

- Full TypeScript with strict mode enabled
- ES Modules (`"type": "module"`)
- Uses ESLint with TypeScript parser and Prettier integration
- Unused parameters prefixed with `_` (e.g., `_req`)
- `prefer-const` and `no-var` enforced
- commander.js for CLI parsing

## Legacy Files

The old JavaScript files in `src/*.js` are still present for backwards compatibility during the migration. They will be removed once the TypeScript migration is complete.

## CLI Commands

```
mcpsm list [--json] [--tokens]     List servers
mcpsm add [name]                   Add server (interactive)
mcpsm remove <server> [-y]         Remove server
mcpsm edit <server>                Edit server
mcpsm test [server]                Test server(s)
mcpsm enable <server>              Enable server
mcpsm disable <server>             Disable server
mcpsm clients [list|connect|disconnect|open]
mcpsm profile [list|create|delete|use|add|remove]
mcpsm settings [list|get|set|reset]
mcpsm tools [list|discover|enable|disable]
mcpsm doctor                       Health check
mcpsm config [--path|--dir]        Open/show config
mcpsm tokens [-d] [--json]         Token usage
mcpsm port [number]                Get/set port
```

### Client Commands Details

- `mcpsm clients list` - Show all detected clients and their connection status (connected/disconnected/not-installed)
- `mcpsm clients connect <client>` - Connect a client by adding the mcpsm gateway server to its config
- `mcpsm clients disconnect <client>` - Disconnect a client by removing the mcpsm gateway server
- `mcpsm clients open <client>` - Open client config file in default editor

## TUI Keybindings

Main screen keyboard shortcuts:

### Navigation

- `↑/↓` - Move between servers
- `Space` - Select/deselect server
- `Enter` - Manage selected servers (open Daemon Management screen)
- `Q` - Quit

### Server Operations

- `A` - Add new server
- `E` - Edit server (remote servers only)
- `D` - Delete server
- `N` - Toggle server enabled/disabled
- `X` - Test all servers

### Views/Screens

- `T` - Tools screen (manage tool filters)
- `C` - Clients screen (connect/disconnect clients)
- `F` - Profiles screen (manage server profiles)
- `G` - Settings screen (configure port, theme, etc.)
- `I` - Import/Export screen

### System

- `H` - Doctor screen (health check)
- `K` - Tokens screen (view token usage)

### Important Notes on Port Changes

- When port is changed in Settings (G), all connected clients are **automatically updated**
- The system reconnects each client to ensure the new port is used
- No client restart required for real-time loading clients (Cursor, Windsurf, VS Code)
