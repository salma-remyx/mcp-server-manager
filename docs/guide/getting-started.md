# Getting Started

MCP Server Manager (`mcpsm`) is a unified CLI and TUI tool for managing MCP (Model Context Protocol) servers across multiple AI clients like Claude Desktop, Cursor, Windsurf, VS Code, and more.

## Why MCP Server Manager?

Managing MCP servers across multiple AI clients is painful:

- **Scattered configs** - Each client has its own config file in different locations
- **Manual sync** - Adding a server means editing multiple JSON files
- **No visibility** - Hard to know which servers are working or failing
- **No testing** - Can't easily verify servers before using them
- **Complex setup** - Updating the port or making changes requires touching every client

**MCP Server Manager** solves all of this with a **gateway pattern** - a single MCP server acts as a proxy to all your configured servers.

## Gateway Pattern Architecture

Instead of syncing individual servers to each client, mcpsm uses a modern **gateway pattern**:

```
Your Servers → mcpsm Daemon ← Client 1 (Claude Desktop)
                           ← Client 2 (Cursor)
                           ← Client 3 (Windsurf)
                           ← Client 4 (VS Code)
```

**Benefits:**

- ✅ One server added per client (mcpsm gateway)
- ✅ All your servers accessible through the gateway
- ✅ Change port once, updates all clients automatically
- ✅ Real-time loading for supported clients (no restart needed)
- ✅ Clean, scalable architecture

## Features

| Feature               | Description                                               |
| --------------------- | --------------------------------------------------------- |
| **Interactive TUI**   | Beautiful terminal UI for managing servers                |
| **Gateway Pattern**   | Single mcpsm server per client; all servers accessible    |
| **Auto Port Updates** | Changing port automatically updates all connected clients |
| **Real-time Loading** | Cursor, Windsurf, VS Code load config changes instantly   |
| **Server testing**    | Test servers in parallel before using them                |
| **Import/Export**     | Migrate configs between machines or clients               |
| **Profiles**          | Group servers by project or context                       |
| **Daemon mode**       | Run gateway in background with auto-start                 |
| **OAuth support**     | Built-in OAuth flow with PKCE for remote servers          |
| **Token counting**    | Track context usage per server and tool                   |

## Connection Model

mcpsm uses a simple **3-state connection model**:

| State         | Meaning                                      | Action         |
| ------------- | -------------------------------------------- | -------------- |
| Connected     | Client has mcpsm gateway; can access servers | Use the client |
| Disconnected  | Client installed but not connected to mcpsm  | Run `connect`  |
| Not Installed | Client not found on system                   | Install client |

## Two Ways to Use

### Interactive TUI

Launch the terminal UI for visual management:

```bash
mcpsm
```

Navigate with arrow keys, press `SPACE` to select servers, `ENTER` to manage them, and use keyboard shortcuts for actions.

### CLI Commands

Run commands directly for quick operations or scripting:

```bash
mcpsm list                    # List all servers
mcpsm test                    # Test all servers
mcpsm clients connect claude  # Connect Claude Desktop
mcpsm port 9000               # Change gateway port (auto-updates all clients)
```

## Quick Workflow

1. **Add your servers** - Use TUI or CLI to add MCP servers
2. **Connect clients** - Add the mcpsm gateway to each client you want to use
3. **Use in clients** - All servers instantly available in every connected client
4. **Change port** - Updating the port automatically updates all clients

Learn more in [Quick Start](/guide/quickstart).

## Recent Changes (v1.1+)

### Gateway Pattern (v1.1)

- Moved from syncing individual servers to a single gateway server pattern
- Simplifies client connection and management
- Automatic port updates across all connected clients

### Client Connection (v1.1)

- New 3-state model: Connected/Disconnected/Not-installed
- Simple `connect`/`disconnect` commands
- Real-time config loading for compatible clients

### Simplified TUI (v1.1)

- Cleaner menu with focused keyboard shortcuts
- Dedicated Clients screen for connection management
- Automatic port propagation in Settings

## Next Steps

- [Installation](/guide/installation) - Install mcpsm on your system
- [Quick Start](/guide/quickstart) - Get up and running in 5 minutes
- [Client Connections](/guide/client-connections) - Learn about connecting clients
- [Configuration](/guide/configuration) - Learn about config files
- [Architecture](/guide/architecture) - Deep dive into the design
