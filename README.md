<div align="center">

# MCP Server Manager

**The all-in-one CLI tool to manage your MCP servers across all clients**

[![npm version](https://img.shields.io/npm/v/mcp-server-manager?color=blue)](https://www.npmjs.com/package/mcp-server-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js->=18-green)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/MateusTorquato/mcp-server-manager/pulls)

**[Documentation](https://mateustorquato.github.io/mcp-server-manager/docs/) • [Quick Start](#quick-start) • [GitHub](https://github.com/MateusTorquato/mcp-server-manager)**

</div>

---

## The Problem

Managing MCP servers across multiple AI clients (Claude Desktop, Cursor, Windsurf, VS Code) is fragmented and tedious:

- 🔧 **Scattered configs** - Each client has its own config file in different locations
- 🔄 **Manual sync** - Adding a server means manually editing multiple JSON files
- 👁️ **No visibility** - Hard to know which servers are working or failing
- 🧪 **No testing** - Can't easily verify servers before using them in your workflow

This friction slows down development and makes server management error-prone.

## The Solution

**MCP Server Manager** is a unified CLI tool that centralizes MCP server management with a single gateway pattern. Add servers once, connect your clients, and everything stays in sync automatically.

---

## Key Features

### Core Functionality

- **🎯 Gateway Pattern** - Single `mcpsm` gateway server proxies to all MCP servers across all clients
- **🎨 Interactive TUI** - Beautiful, intuitive terminal UI with keyboard shortcuts for all operations
- **⚡ Automatic Sync** - Connected clients stay in sync automatically; change port once, update everywhere
- **🧪 Built-in Testing** - Test servers in parallel before using them in your workflow
- **📊 Token Tracking** - Monitor context usage per server and per tool

### Advanced Features

- **🔌 Real-time Loading** - Clients like Cursor/Windsurf load new configs without restart
- **📦 Import/Export** - Migrate configurations between machines and clients
- **📋 Profiles** - Group servers by project or development context
- **🛠️ Daemon Mode** - Run the gateway in the background with auto-start support
- **🔐 OAuth Support** - Built-in OAuth flow with PKCE for secure remote server authentication

---

## 📚 Documentation

Full documentation is available at **[mateustorquato.github.io/mcp-server-manager/docs/](https://mateustorquato.github.io/mcp-server-manager/docs/)**

- **[Getting Started](https://mateustorquato.github.io/mcp-server-manager/docs/)** - Installation, setup, and first steps
- **[Architecture](https://mateustorquato.github.io/mcp-server-manager/docs/)** - How the gateway pattern works
- **[TUI Guide](https://mateustorquato.github.io/mcp-server-manager/docs/)** - Terminal UI navigation and shortcuts
- **[CLI Reference](https://mateustorquato.github.io/mcp-server-manager/docs/)** - All available commands and options
- **[Client Setup](https://mateustorquato.github.io/mcp-server-manager/docs/)** - Connect Claude, Cursor, Windsurf, VS Code
- **[Troubleshooting](https://mateustorquato.github.io/mcp-server-manager/docs/)** - Common issues and solutions

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

↑/↓ Navigate A Add D Delete E Edit Space Enable/Disable
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

### How the Gateway Pattern Works

Instead of syncing individual servers to each client config, MCP Server Manager uses an elegant **gateway pattern**:

```
┌─ Claude Desktop
├─ Cursor           } All connect to a single "mcpsm" gateway server
├─ Windsurf         } The gateway proxies requests to your MCP servers
└─ VS Code
```

**One-time setup:**

1. Connect each client: `mcpsm clients connect claude` (adds mcpsm server to their config)
2. Add your servers normally: `mcpsm add myserver` (just like before)

**Benefits:**

- ✅ All clients have access to all servers automatically
- ✅ Change the port once, all clients update instantly
- ✅ Add new servers once, they appear in all clients
- ✅ No manual syncing needed

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
