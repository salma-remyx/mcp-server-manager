<div align="center">

# MCP Server Manager

**The all-in-one CLI tool to manage your MCP servers across all clients**

[![npm version](https://img.shields.io/npm/v/mcp-server-manager?color=blue)](https://www.npmjs.com/package/mcp-server-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js->=18-green)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/MateusTorquato/mcp-server-manager/pulls)

[Website](https://mateustorquato.github.io/mcp-server-manager/) •
[Documentation](https://mateustorquato.github.io/mcp-server-manager/docs/) •
[Installation](#installation) •
[Quick Start](#quick-start)

</div>

---

## Why MCP Server Manager?

Managing MCP servers across multiple AI clients (Claude Desktop, Cursor, Windsurf, etc.) is painful:

- **Scattered configs** - Each client has its own config file in different locations
- **Manual sync** - Adding a server means editing multiple JSON files
- **No visibility** - Hard to know which servers are working or failing
- **No testing** - Can't easily verify servers before using them

**MCP Server Manager** solves all of this with a single CLI tool.

---

## Features

| Feature               | Description                                               |
| --------------------- | --------------------------------------------------------- |
| **Interactive TUI**   | Beautiful terminal UI for managing servers                |
| **Client gateway**    | Single mcpsm gateway server proxies to all MCP servers    |
| **Auto port sync**    | Automatically updates all clients when port changes       |
| **Real-time loading** | Clients like Cursor/Windsurf load configs without restart |
| **Server testing**    | Test servers in parallel before using them                |
| **Import/Export**     | Migrate configs between machines or clients               |
| **Profiles**          | Group servers by project or context                       |
| **Daemon mode**       | Run gateway in background with auto-start                 |
| **OAuth support**     | Built-in OAuth flow with PKCE for remote servers          |
| **Token counting**    | Track context usage per server and tool                   |

---

## Installation

```bash
npm install -g mcp-server-manager
```

Or run directly with npx:

```bash
npx mcp-server-manager
```

---

## Quick Start

### 1. Launch the interactive TUI

```bash
mcpsm
```

### 2. Or use CLI commands

```bash
# List all servers
mcpsm list

# Add a server
mcpsm add myserver

# Test all servers
mcpsm test

# Connect clients (automatic gateway setup)
mcpsm clients connect claude
mcpsm clients connect cursor
```

For the complete list of commands and options, see the [full documentation](https://mateustorquato.github.io/mcp-server-manager/docs/).

### How Client Connection Works

Instead of syncing individual servers to each client, MCP Server Manager uses a **gateway pattern**:

1. **Connect a client**: `mcpsm clients connect <client-name>`
   - A single `mcpsm` server is added to the client's config
   - This server uses `supergateway` to proxy requests to the daemon

2. **Add your servers normally**: `mcpsm add myserver`
   - Add servers in the usual way through the TUI or CLI
   - All connected clients automatically have access through the gateway

3. **Change port automatically**: Update port in Settings (TUI) or `mcpsm port <number>`
   - All connected clients are automatically updated
   - No need to manually edit client configs

4. **Disconnect when needed**: `mcpsm clients disconnect <client-name>`
   - Removes the mcpsm gateway server from the client's config

---

## Supported Clients

| Client         | Platform                |
| -------------- | ----------------------- |
| Claude Desktop | macOS / Windows         |
| Cursor         | macOS / Windows / Linux |
| Windsurf       | macOS / Windows / Linux |
| VS Code        | macOS / Windows / Linux |
| Claude Code    | CLI                     |
| Codex          | CLI                     |
| Gemini CLI     | CLI                     |

---

## Documentation

Full documentation is available at **[mateustorquato.github.io/mcp-server-manager/docs/](https://mateustorquato.github.io/mcp-server-manager/docs/)**

- [Getting Started](https://mateustorquato.github.io/mcp-server-manager/docs/#/getting-started/installation)
- [CLI Commands](https://mateustorquato.github.io/mcp-server-manager/docs/#/cli/servers)
- [TUI Guide](https://mateustorquato.github.io/mcp-server-manager/docs/#/tui/main-menu)
- [Troubleshooting](https://mateustorquato.github.io/mcp-server-manager/docs/#/guides/troubleshooting)

---

## Requirements

- **Node.js** >= 18.0.0
- **npm** or **npx**

Check your system with:

```bash
mcpsm doctor
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run in development mode
npm run dev       # CLI
npm run dev:tui   # TUI
```

---

## License

MIT © [Mateus Torquato](https://github.com/MateusTorquato)
