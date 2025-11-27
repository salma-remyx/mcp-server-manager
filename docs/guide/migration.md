# Migration Guide

How to migrate your MCP configurations to MCP Server Manager.

## Migrating from Existing Clients

MCP Server Manager can import configurations from existing MCP clients automatically.

### From Claude Desktop

```bash
# Import all servers from Claude Desktop
mcpsm import --from claude
```

This reads from:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### From Cursor

```bash
mcpsm import --from cursor
```

This reads from:

- **All platforms:** `~/.cursor/mcp.json`

### From Windsurf

```bash
mcpsm import --from windsurf
```

This reads from:

- **All platforms:** `~/.codeium/windsurf/mcp_config.json`

### From VS Code

```bash
mcpsm import --from vscode
```

This reads from:

- **macOS:** `~/Library/Application Support/Code/User/mcp.json`
- **Linux:** `~/.config/Code/User/mcp.json`
- **Windows:** `%APPDATA%\Code\User\mcp.json`

## Migrating from JSON Files

### From a backup file

```bash
mcpsm import ~/path/to/backup.json
```

### From Claude format JSON

If you have a `claude_desktop_config.json` file:

```bash
mcpsm import --format claude ~/path/to/claude_desktop_config.json
```

### From mcpsm export format

```bash
mcpsm import ~/path/to/mcpsm-export.json
```

## Migrating to a New Machine

### Step 1: Export from old machine

```bash
# On the old machine
mcpsm export -o mcp-backup.json
```

### Step 2: Transfer the file

Copy `mcp-backup.json` to your new machine via:

- USB drive
- Cloud storage (Dropbox, Google Drive, etc.)
- `scp` or other file transfer

### Step 3: Import on new machine

```bash
# On the new machine
npm install -g mcp-server-manager
mcpsm import ~/path/to/mcp-backup.json
```

### Step 4: Re-authenticate remote servers

OAuth tokens are not exported for security. Re-authenticate any remote servers:

```bash
mcpsm auth login <remote-server-name>
```

### Step 5: Sync to clients

```bash
mcpsm clients enable claude   # or your preferred client
mcpsm clients sync
```

## Migrating Profiles

Profiles are included in the export:

```bash
# Export includes profiles
mcpsm export -o full-backup.json

# Import restores profiles
mcpsm import full-backup.json

# List restored profiles
mcpsm profile list
```

## Migrating Tool Filters

Tool filter settings are also included in exports:

```bash
# Export includes tool filters
mcpsm export -o full-backup.json

# Verify after import
mcpsm tools list
```

## Partial Migration

### Import only specific servers

After importing, you can remove unwanted servers:

```bash
mcpsm import --from claude
mcpsm remove unwanted-server-1
mcpsm remove unwanted-server-2
```

### Merge configurations

Import will add new servers without removing existing ones:

```bash
# Start with some servers
mcpsm add my-server --type stdio --command "..."

# Import more from Claude (won't remove my-server)
mcpsm import --from claude
```

If there's a name conflict, the import will ask if you want to:

- Skip the duplicate
- Overwrite the existing server
- Rename the imported server

## Export Formats

### Default format (mcpsm)

```bash
mcpsm export -o backup.json
```

```json
{
  "version": "1.0",
  "servers": [...],
  "remoteServers": [...],
  "profiles": [...],
  "toolFilters": {...},
  "settings": {...}
}
```

### Claude Desktop format

```bash
mcpsm export --format claude -o claude-config.json
```

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    }
  }
}
```

This format can be directly used as `claude_desktop_config.json`.

## Handling Secrets

### Environment variables

Servers using environment variables will have them exported:

```json
{
  "env": {
    "API_KEY": "your-secret-key"
  }
}
```

**Security tip:** Review and update secrets after importing on a new machine.

### OAuth tokens

OAuth tokens are **not** exported for security reasons. After migrating:

```bash
# Re-authenticate remote servers
mcpsm auth login remote-server-1
mcpsm auth login remote-server-2
```

### Bearer tokens

Bearer tokens for HTTP/SSE servers **are** exported. Consider:

- Generating new tokens after migration
- Using environment variables for tokens

## Troubleshooting Migration

### Import says "no servers found"

The source file might be empty or in an unexpected format:

```bash
# Check the file content
cat ~/path/to/file.json | jq '.'

# Try specifying format
mcpsm import --format claude ~/path/to/file.json
```

### Servers don't work after import

The server commands might not exist on the new machine:

```bash
# Test all servers
mcpsm test

# Install missing dependencies
npm install -g @modelcontextprotocol/server-filesystem
# etc.
```

### Client paths are different

If you migrated between different operating systems, update paths:

```bash
# Edit server with incorrect path
mcpsm edit filesystem

# Or edit config directly
mcpsm config
```

### Duplicate server names

If import fails due to duplicates:

```bash
# List existing servers
mcpsm list

# Remove the duplicate first
mcpsm remove existing-server-name

# Then import
mcpsm import backup.json
```

## Best Practices

### 1. Regular backups

```bash
# Add to crontab or schedule
mcpsm export -o ~/backups/mcp-$(date +%Y%m%d).json
```

### 2. Version control your config

```bash
mcpsm export -o ~/dotfiles/mcp-config.json
cd ~/dotfiles && git add mcp-config.json && git commit -m "Update MCP config"
```

### 3. Document server dependencies

Keep a list of required npm packages for your servers:

```bash
# servers-dependencies.md
- @modelcontextprotocol/server-filesystem
- @modelcontextprotocol/server-github
- etc.
```

### 4. Test after migration

Always verify your configuration works:

```bash
mcpsm doctor
mcpsm test
```
