# Quick Start

This guide will help you get up and running with MCP Server Manager in minutes.

## Step 1: Launch the TUI

The easiest way to start is with the interactive terminal UI:

```bash
mcpsm
```

## Step 2: Add Your First Server

Press `A` to add a new server. You'll be prompted for:

1. **Server name** - A friendly name (e.g., `filesystem`)
2. **Server type** - `stdio` for local, `http`/`sse` for remote
3. **Command** - The command to run the server
4. **Environment variables (optional)** - For stdio servers that need tokens or API keys

### Example: Filesystem Server

```bash
mcpsm add filesystem --type stdio --command "npx" --args "-y @modelcontextprotocol/server-filesystem /path/to/allowed/dir"
```

### Example: Remote Server

```bash
mcpsm add my-api --type http --url "https://api.example.com/mcp"
```

## Step 3: Test Your Servers

Press `X` in the TUI or run:

```bash
mcpsm test
```

This discovers all available tools and shows their status.

## Step 4: Connect Your Clients

The gateway pattern automatically makes all your servers available to connected clients through a single `mcpsm` server.

Press `C` to open the Clients screen, then press `ENTER` on each client you want to connect.

Or via CLI:

```bash
# Connect Claude Desktop
mcpsm clients connect claude

# Connect Cursor
mcpsm clients connect cursor

# Connect Windsurf
mcpsm clients connect windsurf
```

## What Happens When You Connect

- A single `mcpsm` server is added to the client's configuration
- This server proxies all requests to your daemon at `localhost:{port}/mcp`
- All your configured servers become instantly accessible
- For real-time loading clients (Cursor, Windsurf, VS Code), changes appear without restart

## Step 5: Use Your Servers

Your servers are now available in Claude Desktop, Cursor, and other connected clients. No need to manage individual servers per client!

### To change the port:

```bash
mcpsm port 9000
```

All connected clients are automatically updated with the new port.

## Next Steps

- [Configure tool filters](/cli/tools.md)
- [Create profiles](/cli/profiles.md)
- [Set up daemon mode](/cli/daemon.md)
