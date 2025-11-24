# Tools

Commands for managing MCP tools per server.

## tools

List all servers with tool counts.

```bash
mcpsm tools [options]
```

### Options

| Option   | Description           |
| -------- | --------------------- |
| `--json` | Output in JSON format |

### Example

```bash
mcpsm tools
```

### Output

```
Server Tools:

  filesystem     11/11 tools enabled   4,200 tokens
  github         6/8 tools enabled     3,100 tokens
  postgres       ? tools not discovered
```

---

## tools \<server\>

List tools for a specific server.

```bash
mcpsm tools <server> [options]
```

### Options

| Option      | Description                         |
| ----------- | ----------------------------------- |
| `--json`    | Output in JSON format               |
| `-a, --all` | Show all tools (including disabled) |

### Examples

```bash
# Show enabled tools
mcpsm tools filesystem

# Show all tools
mcpsm tools filesystem --all
```

### Output

```
Tools for filesystem (11/11 enabled):

  ✔ read_file           Read file contents         380 tokens
  ✔ write_file          Write content to file      420 tokens
  ✔ list_directory      List directory contents    350 tokens
  ✔ create_directory    Create a new directory     280 tokens
  ...
```

---

## tools discover

Discover available tools from a server.

```bash
mcpsm tools discover <server>
```

### Example

```bash
mcpsm tools discover filesystem
```

This:

1. Starts the server
2. Queries available tools
3. Calculates token counts
4. Saves to tool filters

---

## tools enable

Enable tool(s) for a server.

```bash
mcpsm tools enable <server> [tool] [options]
```

### Options

| Option  | Description      |
| ------- | ---------------- |
| `--all` | Enable all tools |

### Examples

```bash
# Enable specific tool
mcpsm tools enable filesystem write_file

# Enable all tools
mcpsm tools enable filesystem --all
```

---

## tools disable

Disable tool(s) for a server.

```bash
mcpsm tools disable <server> <tool> [options]
```

### Options

| Option  | Description       |
| ------- | ----------------- |
| `--all` | Disable all tools |

### Examples

```bash
# Disable specific tool
mcpsm tools disable filesystem delete_file

# Disable all tools
mcpsm tools disable filesystem --all
```

---

## Token Counting

Each tool has an estimated token count based on:

- Tool name and description
- Parameter schemas
- Return type definitions

This helps you understand context usage before enabling tools.

```bash
# View detailed token info
mcpsm tokens --detailed
```

---

## Example: Minimize Context Usage

```bash
# See all tools
mcpsm tools filesystem --all

# Disable tools you don't need
mcpsm tools disable filesystem delete_file
mcpsm tools disable filesystem move_file

# Verify token savings
mcpsm tokens
```

---

## Tool Filtering in TUI

Press `T` in the main menu to configure tools for the selected server:

```
Tool Filters for filesystem:

  [x] read_file           380 tokens
  [x] write_file          420 tokens
  [x] list_directory      350 tokens
  [ ] delete_file         300 tokens
  [ ] move_file           320 tokens

  SPACE: Toggle  |  A: All  |  N: None  |  ESC: Back
```
