<div align="center">

# MCP Server Manager

**The all-in-one CLI tool to manage your MCP servers across all clients**

[![npm version](https://img.shields.io/npm/v/mcp-server-manager?color=blue)](https://www.npmjs.com/package/mcp-server-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js->=18-green)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/MateusTorquato/mcp-server-manager/pulls)

[📖 Docs](https://mateustorquato.github.io/mcp-server-manager/docs/) •
[🚀 Quick Start](#quick-start) •
[⚙️ Installation](#installation) •
[🌐 Website](https://mateustorquato.github.io/mcp-server-manager/)

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

## 📚 Documentation

Complete guides and references available at **[mateustorquato.github.io/mcp-server-manager/docs/](https://mateustorquato.github.io/mcp-server-manager/docs/)**

- **[Getting Started](https://mateustorquato.github.io/mcp-server-manager/docs/#/getting-started/installation)** - Installation and setup guide
- **[TUI Guide](https://mateustorquato.github.io/mcp-server-manager/docs/#/tui/main-menu)** - Complete guide to the terminal user interface
- **[CLI Commands](https://mateustorquato.github.io/mcp-server-manager/docs/#/cli/servers)** - Detailed command reference
- **[Troubleshooting](https://mateustorquato.github.io/mcp-server-manager/docs/#/guides/troubleshooting)** - Common issues and solutions

---

## TUI vs CLI

MCP Server Manager offers two interfaces to suit your workflow:

### Terminal User Interface (TUI)

Perfect for **interactive management** and **visual navigation**:

- Browse and manage servers with keyboard shortcuts
- See real-time status and tool counts for each server
- Organized menu system with consistent navigation across all screens
- Ideal for discovering features and visual learners

**Launch with:** `mcpsm` (no arguments)

### Command Line Interface (CLI)

Perfect for **scripting**, **automation**, and **batch operations**:

- Direct commands for adding, testing, and managing servers
- Easy integration with scripts and workflows
- Detailed error messages and structured output
- Works great with pipes and shell scripting

**Example:** `mcpsm test` or `mcpsm list --json`

Both interfaces provide the same powerful functionality - choose what works best for your workflow!

### TUI Display

```
MCP Server Manager v1.1.0
Profile: default | Port: 8850

Local Servers (STDIO):
→ ☑ filesystem ✔ 11 tools · 4.2k tokens
  ☑ github ✔ 8 tools · 3.1k tokens
  ☑ postgres ✔ 5 tools · 2.8k tokens

Remote Servers (HTTP/SSE):
  ☐ stripe - 0 tools
  ☑ deepwiki ✔ 3 tools · 1.5k tokens

↑/↓ Navigate SPACE Select A Add D Delete E Edit N Enable/Disable
X Test T Tools C Clients F Profiles G Settings M Daemon Q Quit
```

See all available keyboard shortcuts at a glance, with tool counts and token estimates for each server.

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
