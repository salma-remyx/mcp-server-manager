# Profiles

Commands for managing server profiles. Profiles let you group servers for different contexts (work, personal, projects).

## profile

List all profiles.

```bash
mcpsm profile
# or
mcpsm profile list
```

### Output

```
Profiles:

  1. work (active)     3 servers
  2. personal          2 servers
  3. project-alpha     5 servers
     (no profile)      all servers
```

---

## profile create

Create a new profile.

```bash
mcpsm profile create <name>
```

### Example

```bash
mcpsm profile create work
```

?> New profiles start empty. Use `profile add` to add servers.

---

## profile delete

Delete a profile.

```bash
mcpsm profile delete <name>
```

### Example

```bash
mcpsm profile delete old-project
```

!> Deleting a profile does not delete the servers in it.

---

## profile use

Switch to a profile.

```bash
mcpsm profile use <name>
```

### Example

```bash
# Switch to work profile
mcpsm profile use work

# Switch back to all servers (no profile)
mcpsm profile use none
```

When a profile is active:

- Only servers in that profile are shown in the TUI
- Only profile servers are synced to clients
- Only profile servers are started with the daemon

---

## profile add

Add a server to a profile.

```bash
mcpsm profile add <profile> <server>
```

### Examples

```bash
# Add by server name
mcpsm profile add work filesystem

# Add by server ID
mcpsm profile add work abc123
```

---

## profile remove

Remove a server from a profile.

```bash
mcpsm profile remove <profile> <server>
```

### Example

```bash
mcpsm profile remove work postgres
```

---

## Example Workflow

```bash
# Create profiles
mcpsm profile create work
mcpsm profile create personal

# Add servers to profiles
mcpsm profile add work filesystem
mcpsm profile add work github
mcpsm profile add personal spotify
mcpsm profile add personal home-assistant

# Switch to work profile
mcpsm profile use work

# Now only work servers are active
mcpsm list
mcpsm clients sync
mcpsm start
```

---

## Default Profile

Set a default profile to load on startup:

```bash
mcpsm settings set defaultProfile work
```

Clear default profile:

```bash
mcpsm settings set defaultProfile null
```
