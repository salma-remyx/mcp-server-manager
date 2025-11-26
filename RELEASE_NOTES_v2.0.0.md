# Release Notes - v2.0.0

## 🎉 Major Release

This release introduces OAuth 2.1 authentication with PKCE, significant TUI improvements, and many bug fixes.

## ✨ New Features

### OAuth 2.1 Authentication with PKCE

- Full OAuth 2.1 implementation with PKCE (Proof Key for Code Exchange) for secure authentication
- New `AuthScreen` for managing OAuth tokens in the TUI
- Automatic token refresh support
- OAuth callback pages with proper HTML templates
- CLI commands for OAuth authentication (`mcpsm auth login`, `mcpsm auth logout`, `mcpsm auth refresh`)

### TUI Enhancements

- **Confirmation Dialogs**: Reusable `ConfirmDialog` component for delete operations and other confirmations
- **Scrollable Lists**: New `ScrollableList` component with improved scrolling behavior
- **Screen Layout**: New `ScreenLayout` component for consistent screen structure
- **Visual Status Indicators**: Clear ✓/✗ indicators for enabled/disabled servers
- **"Needs Authentication" Indicator**: Shows which servers require authentication on the main page

### Improved User Experience

- Auto-test servers when adding new ones
- Auto-trigger OAuth flow on 401 errors when adding remote servers
- Duplicate server name detection
- Auto-select new servers after adding
- Authentication success page auto-closes
- Improved scroll behavior (only scrolls at edges, not re-centering)

## 🐛 Bug Fixes

### Client Configuration

- Fixed Claude Code config path (now correctly uses `~/.claude.json`)
- Fixed Codex TOML config parsing (no longer tries to parse TOML as JSON)
- Proper handling of TOML-based clients in connect/disconnect operations

### Process Management

- Improved process cleanup to prevent orphaned Node processes
- Added timeout to connection cleanup to prevent hanging
- Better error handling for uncaught exceptions in gateway

### TUI Fixes

- Fixed OAuth denied auth returning success incorrectly
- Fixed selection reset on enable/disable all tools
- Fixed newly added servers not showing checkmark
- Fixed arrow consistency (using → everywhere)
- Fixed scroll indicators flickering

## 🔧 Improvements

### Code Quality

- Better error handling and cleanup
- Improved process management
- More consistent UI components
- Better separation of concerns

### Documentation

- Updated shortcuts documentation
- Improved CLI documentation

## 📊 Statistics

- **44 files changed**
- **4,663 insertions(+), 912 deletions(-)**
- **19 commits** since v1.2.1

## 🔄 Migration Notes

### Breaking Changes

- OAuth configuration format has changed - existing OAuth servers may need to be reconfigured
- Some TUI keyboard shortcuts have been updated (see `docs/tui/shortcuts.md`)

### Upgrade Path

1. Update to v2.0.0: `npm install -g mcp-server-manager@2.0.0`
2. Re-authenticate any OAuth servers if needed
3. Review updated shortcuts if using TUI

## 🙏 Contributors

Thanks to all contributors who made this release possible!

---

**Full Changelog**: https://github.com/MateusTorquato/mcp-server-manager/compare/v1.2.1...v2.0.0
