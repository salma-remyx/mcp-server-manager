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

## profile clone

Clone an existing profile to create a new one with the same configuration.

```bash
mcpsm profile clone <source> <target> [displayName]
```

### Arguments

- `source` - ID of the profile to clone
- `target` - ID for the new profile
- `displayName` - (Optional) Display name for the new profile

### Examples

```bash
# Clone with auto-generated name
mcpsm profile clone production staging

# Clone with custom display name
mcpsm profile clone dev test "Test Environment"
```

### Notes

- Copies all servers, remote servers, and tool filters
- Target profile ID must not already exist
- If displayName is omitted, uses source name with " (Copy)" suffix

---

## profile rename

Rename a profile's display name.

```bash
mcpsm profile rename <profile> <newName>
```

### Example

```bash
mcpsm profile rename work "Work Servers"
```

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

# Clone a profile for testing
mcpsm profile clone work staging "Staging Servers"

# Rename a profile
mcpsm profile rename personal "Personal Projects"

# Switch to work profile
mcpsm profile use work

# Now only work servers are active
mcpsm list
mcpsm clients sync
mcpsm start
```

---

## Active Profile

The active profile is the currently selected profile. All servers and tools shown in the TUI and used by the daemon are based on the active profile.

Switch to a different profile:

```bash
mcpsm profile use work
```

Note: The active profile cannot be deleted. Switch to a different profile first if you need to delete the currently active one.
