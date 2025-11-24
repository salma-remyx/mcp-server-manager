# Configuration

MCP Server Manager stores all configuration in `~/.mcp-manager/`.

## Configuration Files

| File                | Description                              |
| ------------------- | ---------------------------------------- |
| `config.json`       | Server configurations (local and remote) |
| `tool-filters.json` | Per-server tool enable/disable settings  |
| `settings.json`     | Application settings                     |
| `profiles.json`     | Profile definitions                      |
| `clients.json`      | Client sync state                        |

## config.json

Main configuration file containing server definitions:

```json
{
  "port": 8080,
  "servers": [
    {
      "id": "abc123",
      "name": "filesystem",
      "command": "npx",
      "args": "-y @modelcontextprotocol/server-filesystem /home/user",
      "enabled": true
    }
  ],
  "remoteServers": [
    {
      "id": "def456",
      "name": "my-api",
      "type": "http",
      "url": "https://api.example.com/mcp",
      "enabled": true
    }
  ]
}
```

## tool-filters.json

Controls which tools are enabled per server:

```json
{
  "abc123": {
    "allTools": ["read_file", "write_file", "list_directory"],
    "enabled": ["read_file", "list_directory"],
    "totalTokens": 4200
  }
}
```

## settings.json

Application-wide settings:

```json
{
  "port": 8080,
  "editor": "code",
  "autoSync": true,
  "autoTest": false,
  "theme": "default",
  "defaultProfile": null
}
```

### Available Settings

| Setting          | Type    | Default   | Description                            |
| ---------------- | ------- | --------- | -------------------------------------- |
| `port`           | number  | `8080`    | Gateway port                           |
| `editor`         | string  | `$EDITOR` | Default editor for config              |
| `autoSync`       | boolean | `true`    | Auto-sync to clients on changes        |
| `autoTest`       | boolean | `false`   | Auto-test servers on startup           |
| `theme`          | string  | `default` | TUI theme (default, minimal, colorful) |
| `defaultProfile` | string  | `null`    | Default profile to load                |

## profiles.json

Server groupings for different contexts:

```json
{
  "work": {
    "name": "work",
    "servers": ["abc123", "def456"]
  },
  "personal": {
    "name": "personal",
    "servers": ["ghi789"]
  }
}
```

## Edit Configuration

Open config in your default editor:

```bash
mcpsm config
```

Show config file path:

```bash
mcpsm config --path
```

Show config directory:

```bash
mcpsm config --dir
```
