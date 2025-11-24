# Settings

Commands for managing application settings.

## settings

List all settings and their current values.

```bash
mcpsm settings
```

### Output

```
Settings:

  port            8080          Gateway port number
  editor          code          Default editor command
  autoSync        true          Auto-sync to clients on changes
  autoTest        false         Auto-test servers on startup
  theme           default       TUI theme
  defaultProfile  null          Default profile to load
```

---

## settings get

Get a specific setting value.

```bash
mcpsm settings get <key>
```

### Example

```bash
mcpsm settings get port
# Output: 8080
```

---

## settings set

Set a setting value.

```bash
mcpsm settings set <key> <value>
```

### Examples

```bash
# Change gateway port
mcpsm settings set port 9000

# Set default editor
mcpsm settings set editor vim

# Enable auto-sync
mcpsm settings set autoSync true

# Disable auto-test
mcpsm settings set autoTest false

# Change theme
mcpsm settings set theme minimal

# Set default profile
mcpsm settings set defaultProfile work

# Clear default profile
mcpsm settings set defaultProfile null
```

---

## settings reset

Reset all settings to defaults.

```bash
mcpsm settings reset
```

### Default Values

| Setting          | Default             |
| ---------------- | ------------------- |
| `port`           | `8080`              |
| `editor`         | `$EDITOR` or `nano` |
| `autoSync`       | `true`              |
| `autoTest`       | `false`             |
| `theme`          | `default`           |
| `defaultProfile` | `null`              |

---

## Available Settings

### port

Gateway HTTP port number.

```bash
mcpsm settings set port 8080
```

- Type: `number`
- Range: `1024-65535`
- Default: `8080`

### editor

Command to open config files.

```bash
mcpsm settings set editor "code -w"
```

- Type: `string`
- Default: `$EDITOR` environment variable, or `nano`

### autoSync

Automatically sync to clients when servers change.

```bash
mcpsm settings set autoSync true
```

- Type: `boolean`
- Default: `true`

When enabled, syncs after:

- Adding/removing servers
- Enabling/disabling servers
- Changing tool filters
- Switching profiles

### autoTest

Automatically test servers on TUI startup.

```bash
mcpsm settings set autoTest true
```

- Type: `boolean`
- Default: `false`

### theme

TUI color theme.

```bash
mcpsm settings set theme minimal
```

- Type: `string`
- Options: `default`, `minimal`, `colorful`
- Default: `default`

### defaultProfile

Profile to load automatically on startup.

```bash
mcpsm settings set defaultProfile work
```

- Type: `string` or `null`
- Default: `null` (all servers)

---

## Settings in TUI

Press `G` in the main menu to open Settings:

```
Settings:

  1. Gateway Port       8080
  2. Editor             code
  3. Auto-Sync          ON
  4. Auto-Test          OFF
  5. Theme              default
  6. Default Profile    (none)

  1-6: Edit  |  R: Reset All  |  ESC: Back
```
