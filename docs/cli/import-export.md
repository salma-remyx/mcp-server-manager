# Import & Export

Commands for migrating server configurations.

## import

Import servers from a file or existing client.

```bash
mcpsm import <source> [options]
```

### Import from File

```bash
mcpsm import ./backup.json
```

### Import from Client

```bash
mcpsm import --from <client>
```

Supported clients: `claude`, `cursor`, `windsurf`, `vscode`

### Examples

```bash
# Import from Claude Desktop
mcpsm import --from claude

# Import from Cursor
mcpsm import --from cursor

# Import from JSON file
mcpsm import ./my-servers.json
```

### Import Behavior

- Servers with duplicate names are skipped
- Server IDs are regenerated on import
- Tool filters are reset (need to re-discover tools)

---

## export

Export servers to stdout or file.

```bash
mcpsm export [options]
```

### Options

| Option                | Description                        |
| --------------------- | ---------------------------------- |
| `-o, --output <file>` | Write to file instead of stdout    |
| `--format <format>`   | Export format: `mcpsm` or `claude` |

### Formats

| Format   | Description                          |
| -------- | ------------------------------------ |
| `mcpsm`  | Native format, includes all metadata |
| `claude` | Claude Desktop compatible format     |

### Examples

```bash
# Export to stdout (MCPSM format)
mcpsm export

# Export to file
mcpsm export -o backup.json

# Export in Claude format
mcpsm export --format claude -o claude-config.json

# Pipe to clipboard (macOS)
mcpsm export | pbcopy
```

### MCPSM Format

```json
{
  "version": "1.7.0",
  "exported": "2024-01-15T10:30:00Z",
  "servers": [
    {
      "name": "filesystem",
      "type": "stdio",
      "command": "npx",
      "args": "-y @modelcontextprotocol/server-filesystem /home/user"
    }
  ],
  "remoteServers": [
    {
      "name": "my-api",
      "type": "http",
      "url": "https://api.example.com/mcp"
    }
  ]
}
```

### Claude Format

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user"]
    }
  }
}
```

---

## Backup & Restore

### Create Backup

```bash
mcpsm export -o ~/mcp-backup-$(date +%Y%m%d).json
```

### Restore from Backup

```bash
mcpsm import ~/mcp-backup-20240115.json
```

### Migrate Between Machines

1. On the source machine:

   ```bash
   mcpsm export -o servers.json
   ```

2. Transfer `servers.json` to the new machine

3. On the target machine:
   ```bash
   mcpsm import servers.json
   mcpsm test
   mcpsm clients sync
   ```
