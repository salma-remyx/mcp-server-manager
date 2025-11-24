# Installation

## Requirements

- Node.js 18 or higher
- npm or yarn

## Install via npm

```bash
npm install -g mcp-server-manager
```

## Install via yarn

```bash
yarn global add mcp-server-manager
```

## Verify Installation

```bash
mcpsm version
```

You should see output like:

```
mcp-server-manager v1.7.0
```

## Health Check

Run the doctor command to verify all dependencies:

```bash
mcpsm doctor
```

This checks:

- Node.js version
- npm/npx availability
- uv (Python package manager)
- Python installation

## Update

To update to the latest version:

```bash
npm update -g mcp-server-manager
```

## Uninstall

```bash
npm uninstall -g mcp-server-manager
```

?> **Tip:** Your configuration files in `~/.mcp-manager/` are preserved when uninstalling.
