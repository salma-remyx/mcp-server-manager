# Daemon

Commands for running the MCP gateway as a background service.

## start

Start the gateway daemon.

```bash
mcpsm start [servers...] [options]
```

### Options

| Option             | Description                           |
| ------------------ | ------------------------------------- |
| `--profile <name>` | Start servers from a specific profile |
| `--fg`             | Run in foreground (not as daemon)     |

### Examples

```bash
# Start all enabled servers
mcpsm start

# Start specific servers
mcpsm start filesystem github

# Start with a profile
mcpsm start --profile work

# Run in foreground (useful for debugging)
mcpsm start --fg
```

### What Happens

1. Selected servers are spawned
2. Gateway listens on configured port (default: 8080)
3. Process runs in background
4. PID is saved for later management

---

## stop

Stop the running daemon.

```bash
mcpsm stop
```

This gracefully shuts down:

- All running MCP server processes
- The gateway HTTP server

---

## status

Show daemon status.

```bash
mcpsm status
```

### Output

```
Gateway Status: RUNNING

  PID: 12345
  Port: 8080
  Uptime: 2h 15m

  Running Servers:
    ● filesystem    11 tools
    ● github        8 tools
```

Or if not running:

```
Gateway Status: STOPPED
```

---

## logs

View or manage daemon logs.

```bash
mcpsm logs [options]
```

### Options

| Option            | Description                        |
| ----------------- | ---------------------------------- |
| `-f, --follow`    | Follow log output (like `tail -f`) |
| `-n, --lines <n>` | Show last n lines (default: 50)    |
| `--clear`         | Clear log file                     |

### Examples

```bash
# View last 50 lines
mcpsm logs

# View last 100 lines
mcpsm logs -n 100

# Follow logs in real-time
mcpsm logs -f

# Clear logs
mcpsm logs --clear
```

### Log Location

Logs are stored in `~/.mcp-manager/daemon.log`

---

## startup

Manage auto-start on system boot.

```bash
mcpsm startup <enable|disable|status>
```

### Enable Auto-Start

```bash
mcpsm startup enable
```

This creates:

- **macOS**: LaunchAgent plist in `~/Library/LaunchAgents/`
- **Linux**: Systemd user service in `~/.config/systemd/user/`
- **Windows**: Startup shortcut

### Disable Auto-Start

```bash
mcpsm startup disable
```

### Check Status

```bash
mcpsm startup status
```

---

## Example: Production Setup

```bash
# Configure daemon
mcpsm settings set port 8080

# Create a production profile
mcpsm profile create production
mcpsm profile add production filesystem
mcpsm profile add production api-server

# Start with profile
mcpsm start --profile production

# Enable auto-start
mcpsm startup enable

# Verify
mcpsm status
mcpsm startup status
```

---

## Troubleshooting

### Daemon Won't Start

```bash
# Check logs
mcpsm logs -n 100

# Try foreground mode
mcpsm start --fg
```

### Port Already in Use

```bash
# Change port
mcpsm settings set port 9000

# Restart daemon
mcpsm stop
mcpsm start
```

### Check Process Manually

```bash
# macOS/Linux
ps aux | grep mcpsm

# Check port
lsof -i :8080
```
