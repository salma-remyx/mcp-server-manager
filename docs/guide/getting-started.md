# Getting Started

MCP Server Manager (`mcpsm`) is a CLI tool for managing MCP (Model Context Protocol) servers across multiple AI clients like Claude Desktop, Cursor, Windsurf, VS Code, and more.

## Why MCP Server Manager?

Managing MCP servers across multiple AI clients is painful:

- **Scattered configs** - Each client has its own config file in different locations
- **Manual sync** - Adding a server means editing multiple JSON files
- **No visibility** - Hard to know which servers are working or failing
- **No testing** - Can't easily verify servers before using them

**MCP Server Manager** solves all of this with a single CLI tool.

## Features

| Feature               | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| **Interactive TUI**   | Beautiful terminal UI for managing servers                  |
| **Multi-client sync** | Sync servers to Claude, Cursor, Windsurf, VS Code, and more |
| **Server testing**    | Test servers in parallel before using them                  |
| **Import/Export**     | Migrate configs between machines or clients                 |
| **Profiles**          | Group servers by project or context                         |
| **Daemon mode**       | Run gateway in background with auto-start                   |
| **OAuth support**     | Built-in OAuth flow with PKCE for remote servers            |
| **Token counting**    | Track context usage per server and tool                     |

## Two Ways to Use

### Interactive TUI

Launch the terminal UI for visual management:

```bash
mcpsm
```

Use arrow keys to navigate, SPACE to select servers, and keyboard shortcuts for actions.

### CLI Commands

Run commands directly for quick operations or scripting:

```bash
mcpsm list          # List all servers
mcpsm test          # Test all servers
mcpsm clients sync  # Sync to clients
```

## Next Steps

- [Installation](/guide/installation) - Install mcpsm on your system
- [Quick Start](/guide/quickstart) - Get up and running in 5 minutes
- [Configuration](/guide/configuration) - Learn about config files
