# Client Sync

Commands for managing MCP client synchronization.

## Supported Clients

| Client         | ID            | Platform              |
| -------------- | ------------- | --------------------- |
| Claude Desktop | `claude`      | macOS, Windows        |
| Cursor         | `cursor`      | macOS, Windows, Linux |
| Windsurf       | `windsurf`    | macOS, Windows, Linux |
| VS Code        | `vscode`      | macOS, Windows, Linux |
| Claude Code    | `claude-code` | CLI                   |

---

## clients

List detected MCP clients and their sync status.

```bash
mcpsm clients
```

### Output

```
Detected MCP Clients:

  1. Claude Desktop     ✔ Installed   SYNC: ON    (3 servers)
  2. Cursor            ✔ Installed   SYNC: OFF
  3. Windsurf          ✘ Not found
  4. VS Code           ✔ Installed   SYNC: ON    (3 servers)
```

---

## clients sync

Sync servers to enabled clients.

```bash
mcpsm clients sync [client]
```

### Examples

```bash
# Sync to all enabled clients
mcpsm clients sync

# Sync to specific client
mcpsm clients sync claude
```

### What Gets Synced

- All enabled servers
- Active profile servers (if a profile is selected)
- Tool filter settings

---

## clients enable

Enable auto-sync for a client.

```bash
mcpsm clients enable <client>
```

### Examples

```bash
# Enable Claude Desktop sync
mcpsm clients enable claude

# Enable Cursor sync
mcpsm clients enable cursor
```

---

## clients disable

Disable auto-sync for a client.

```bash
mcpsm clients disable <client>
```

### Example

```bash
mcpsm clients disable cursor
```

---

## clients open

Open a client's config file in your default editor.

```bash
mcpsm clients open <client>
```

### Examples

```bash
# Open Claude Desktop config
mcpsm clients open claude

# Open Cursor config
mcpsm clients open cursor
```

---

## Auto-Sync

When `autoSync` is enabled in settings, servers are automatically synced to clients whenever you:

- Add or remove a server
- Enable or disable a server
- Change tool filters
- Switch profiles

To toggle auto-sync:

```bash
# Enable auto-sync
mcpsm settings set autoSync true

# Disable auto-sync
mcpsm settings set autoSync false
```
