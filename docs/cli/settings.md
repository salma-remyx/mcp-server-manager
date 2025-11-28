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

  port            8850          Gateway port number
  editor          vi            Default editor command
  theme           default       TUI theme
  defaultProfile  default       Default profile to load
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

# Change theme
mcpsm settings set theme minimal

# Set default profile
mcpsm settings set defaultProfile work
```

---

## settings reset

Reset all settings to defaults.

```bash
mcpsm settings reset
```

### Default Values

| Setting          | Default           |
| ---------------- | ----------------- |
| `port`           | `8850`            |
| `editor`         | `$EDITOR` or `vi` |
| `theme`          | `default`         |
| `defaultProfile` | `default`         |

---

## Available Settings

### port

Gateway HTTP port number.

```bash
mcpsm settings set port 8080
```

- Type: `number`
- Range: `1024-65535`
- Default: `8850`

### editor

Command to open config files.

```bash
mcpsm settings set editor "code -w"
```

- Type: `string`
- Default: `$EDITOR` environment variable, or `vi`

### theme

TUI color theme with three options:

- **`default`** - Balanced color scheme for general use. Uses cyan, magenta, green, and yellow with good contrast. Best for most users.
- **`minimal`** - Subdued colors for reduced visual noise. Primarily uses white and gray with minimal color accents. Best for focused work or users who prefer minimal styling.
- **`colorful`** - Vibrant colors for maximum visual distinction. Uses bright, saturated colors throughout the interface. Best for users who want clear visual separation between elements.

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

- Type: `string`
- Default: `default`

---

## Settings in TUI

Press `G` in the main menu to open Settings:

```
Settings:

  → port: 8850 (default)
    editor: vi
    theme: default
    defaultProfile: default

  Enter/Space: edit or toggle · R: reset all · ESC: back
```
