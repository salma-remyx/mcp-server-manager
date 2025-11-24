---
name: tui-cli
description: Auto-generates TUI+CLI parity checklists based on modified files. Analyzes git diff to detect which features need CLI/TUI synchronization across the MCP Server Manager codebase.
---

# TUI + CLI Parity Checker

Automatically generates feature parity checklists based on your git changes. When you modify code that affects both CLI and TUI interfaces, this skill identifies which features need synchronization.

## How It Works

The skill:

1. **Detects your branch** - If on a feature branch, compares with `main`; if on `main`, shows staged/unstaged changes
2. **Maps changed files** - Groups modifications by feature type (CLI commands, TUI screens, shared logic, etc.)
3. **Generates checklists** - Creates customized verification items for each affected feature
4. **Filters noise** - Ignores config files (package.json, package-lock.json) and re-export index files

## Usage

Run the analysis script to generate your parity checklist:

```bash
python3 .claude/skills/tui-cli/scripts/generate_checklist.py
```

**Output includes:**

- 🌿 Current branch info
- 🔍 Number of source files modified across features
- 📦 Configuration/dependency files (listed separately)
- Feature-grouped file list
- Customized parity checklist for each feature

## Feature Detection Map

The skill recognizes these file patterns:

```
src/cli/commands/        → CLI Command Implementation
src/tui/screens/         → TUI Screen Implementation
src/tui/index.ts         → TUI Main Screen/Key Bindings
src/services/*.ts        → Shared Business Logic
src/shared/features.ts   → Feature Registry
tests/                   → Test Coverage
```

## Parity Checklist Items

For each modified feature, you'll verify:

### 1. Shared Logic

- [ ] Business logic in `src/services/`
- [ ] Function exported for CLI + TUI use
- [ ] I/O separated from core logic

### 2. CLI Implementation

- [ ] Command in `src/cli/commands/`
- [ ] Supports `--json` flag if applicable
- [ ] Supports `-y`/`--force` if applicable

### 3. TUI Implementation

- [ ] Screen/handler in `src/tui/`
- [ ] Keyboard shortcuts documented
- [ ] State management consistent with CLI

### 4. Feature Registry

- [ ] Updated `src/shared/features.ts`
- [ ] Defines `id`, `name`, `category`
- [ ] Lists `cliCommands` and `tuiImplementation`

### 5. Testing

- [ ] Run `npm test` for parity verification
- [ ] Feature in both CLI and TUI
- [ ] Behavior consistent across interfaces

## Example Output

**On main branch with no changes:**

```
✅ No changes detected - nothing needs to be done
```

**On feature branch with CLI + TUI changes:**

```
🌿 Current branch: matt/implement-gateway

🔍 Detected 5 source file(s) across 3 feature(s)
📦 Also modified: `package-lock.json`, `package.json` (config/deps)

### Modified Files by Feature

**DAEMON**
  - [CLI] src/cli/commands/daemon.cmd.ts

**DAEMONSCREEN**
  - [TUI] src/tui/screens/DaemonScreen.tsx
  - [TUI] tests/tui/screens/DaemonScreen.test.tsx

**GATEWAY**
  - [Logic] src/services/gateway.service.ts

[Customized checklist for each feature...]
```
