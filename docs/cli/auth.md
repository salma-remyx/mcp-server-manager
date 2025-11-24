# Authentication

Commands for managing authentication with remote MCP servers.

## Overview

Remote servers (HTTP/SSE) may require authentication. MCPSM supports:

- **Bearer tokens** - Simple token-based auth
- **OAuth 2.0** - Full OAuth flow with PKCE

---

## auth

Authenticate with a remote server using OAuth.

```bash
mcpsm auth <server>
```

### Example

```bash
mcpsm auth my-api
```

### OAuth Flow

1. Opens browser to authorization URL
2. User logs in and approves access
3. Callback receives authorization code
4. Exchanges code for access token
5. Token is securely stored

### Requirements

The remote server must support:

- OAuth 2.0 authorization code flow
- PKCE (Proof Key for Code Exchange)

---

## auth status

Show authentication status for servers.

```bash
mcpsm auth status [server] [options]
```

### Options

| Option   | Description           |
| -------- | --------------------- |
| `--json` | Output in JSON format |

### Examples

```bash
# Show all servers
mcpsm auth status

# Show specific server
mcpsm auth status my-api

# JSON output
mcpsm auth status --json
```

### Output

```
Authentication Status:

  my-api          ✔ Authenticated (expires: 2024-01-20)
  other-api       ✘ Not authenticated
  secure-server   ✔ Bearer token set
```

---

## auth set

Set a bearer token directly (skip OAuth).

```bash
mcpsm auth set <server> <token>
```

### Example

```bash
mcpsm auth set my-api "eyJhbGciOiJIUzI1NiIs..."
```

Use this when:

- You have an API key or token
- Server doesn't support OAuth
- Testing with a temporary token

---

## auth revoke

Remove stored credentials for a server.

```bash
mcpsm auth revoke <server>
```

### Example

```bash
mcpsm auth revoke my-api
```

This removes:

- OAuth tokens (access and refresh)
- Bearer tokens
- Any stored credentials

---

## Token Storage

Credentials are stored in:

- **macOS**: Keychain
- **Linux**: Secret Service (via libsecret)
- **Windows**: Credential Manager

Fallback: Encrypted file in `~/.mcp-manager/`

---

## Adding Authenticated Servers

### With Bearer Token

```bash
mcpsm add my-api --type http --url "https://api.example.com/mcp" --token "your-token"
```

### With OAuth (after adding)

```bash
mcpsm add my-api --type http --url "https://api.example.com/mcp"
mcpsm auth my-api
```

---

## Troubleshooting

### OAuth Callback Failed

Ensure no other process is using the callback port (default: 8888).

### Token Expired

```bash
# Re-authenticate
mcpsm auth my-api
```

### Invalid Token

```bash
# Remove and re-set
mcpsm auth revoke my-api
mcpsm auth set my-api "new-token"
```

### Test Connection

```bash
mcpsm test my-api
```

If authentication fails, the test will show:

```
Testing my-api... ✘ Failed (401 Unauthorized)
```
