# Server Management

Commands for managing MCP servers.

## list

List all configured servers.

```bash
mcpsm list [options]
```

### Options

| Option     | Description                |
| ---------- | -------------------------- |
| `--json`   | Output in JSON format      |
| `--tokens` | Show per-tool token counts |

### Examples

```bash
# List all servers
mcpsm list

# JSON output for scripting
mcpsm list --json

# Show token usage
mcpsm list --tokens
```

### Output

```
Local Servers (STDIO):
  ● filesystem    ✔ 11 tools · 4.2k tokens
  ● github        ✔ 8 tools · 3.1k tokens
  ○ postgres      ? unknown

Remote Servers (HTTP/SSE):
  ● my-api [HTTP] ✔ 5 tools · 5.2k tokens
```

---

## add

Add a new MCP server.

```bash
mcpsm add [name] [options]
```

### Interactive Mode

```bash
mcpsm add
```

Prompts for all required information.

### Options

| Option            | Description                            |
| ----------------- | -------------------------------------- |
| `--type <type>`   | Server type: `stdio`, `http`, or `sse` |
| `--command <cmd>` | Command to run (STDIO only)            |
| `--args <args>`   | Command arguments (STDIO only)         |
| `--env <env...>`  | Env vars for STDIO servers (`KEY=VAL`) |
| `--url <url>`     | Server URL (HTTP/SSE only)             |
| `--token <token>` | Bearer token for auth (HTTP/SSE only)  |

Use spaces or commas to pass multiple `--env` values, e.g. `--env "FOO=bar BAR=baz"`.

### Examples

```bash
# Add local STDIO server
mcpsm add filesystem --type stdio --command "npx" --args "-y @modelcontextprotocol/server-filesystem /home/user"

# Add local STDIO server that needs an auth token
mcpsm add github --type stdio --command "npx" --args "-y @modelcontextprotocol/server-github" --env "GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxx"

# Add remote HTTP server
mcpsm add my-api --type http --url "https://api.example.com/mcp"

# Add with authentication
mcpsm add secure-api --type http --url "https://api.example.com/mcp" --token "your-bearer-token"
```

---

## remove

Remove a server. Aliases: `rm`, `delete`

```bash
mcpsm remove <name|id> [options]
```

### Options

| Option      | Description              |
| ----------- | ------------------------ |
| `-y, --yes` | Skip confirmation prompt |

### Examples

```bash
# Remove with confirmation
mcpsm remove filesystem

# Remove without confirmation
mcpsm remove filesystem -y

# Remove by ID
mcpsm rm abc123 -y
```

---

## edit

Edit an existing server's configuration.

```bash
mcpsm edit <name|id> [options]
```

### Options

| Option            | Description                       |
| ----------------- | --------------------------------- |
| `--name <name>`   | Change server name                |
| `--url <url>`     | Change URL (remote only)          |
| `--token <token>` | Change bearer token (remote only) |
| `--command <cmd>` | Change command (local only)       |
| `--args <args>`   | Change arguments (local only)     |

### Examples

```bash
# Change server name
mcpsm edit filesystem --name fs-server

# Update remote URL
mcpsm edit my-api --url "https://new-api.example.com/mcp"

# Update command args
mcpsm edit filesystem --args "-y @modelcontextprotocol/server-filesystem /new/path"
```

---

## test

Test server connectivity and discover tools.

```bash
mcpsm test [name|id]
```

### Examples

```bash
# Test all servers
mcpsm test

# Test specific server
mcpsm test filesystem
```

### Output

```
Testing filesystem... ✔ OK (11 tools)
Testing github... ✔ OK (8 tools)
Testing postgres... ✘ Failed (connection refused)
```
