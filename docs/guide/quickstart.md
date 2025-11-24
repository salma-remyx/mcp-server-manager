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

## Step 4: Sync to Clients

Press `C` to open the Clients screen, then:

1. Press the number of a client to enable sync
2. Press `S` to sync all servers

Or via CLI:

```bash
mcpsm clients enable claude
mcpsm clients sync
```

## Step 5: Start the Gateway

Select servers with `SPACE` and press `ENTER` to start.

Or via CLI:

```bash
mcpsm start
```

## Next Steps

- [Configure tool filters](cli/tools.md)
- [Create profiles](cli/profiles.md)
- [Set up daemon mode](cli/daemon.md)
