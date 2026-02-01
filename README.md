# ContextBuddy Standalone

A macOS menu bar app that makes ContextBuddy zero-config. Companion app for Claude Code CLI.

## Vision

**Current (CLI version):** Clone → npm install → npm build → configure .mcp.json → run claude

**Standalone:** Download app → drag to Applications → launch → run claude

## How It Works

```
┌─────────────────────────────────────┐
│  ContextBuddy.app (Menu Bar)        │
├─────────────────────────────────────┤
│  • Bundles Node.js runtime          │
│  • Bundles MCP server               │
│  • Auto-configures ~/.mcp.json      │
│  • Runs web dashboard               │
│  • Menu bar icon for quick access   │
└─────────────────────────────────────┘
         ↕ MCP Protocol
┌─────────────────────────────────────┐
│  Claude Code CLI                    │
│  (user runs in any terminal)        │
└─────────────────────────────────────┘
```

## Features

### Menu Bar
- Status indicator (running/stopped)
- Quick actions:
  - Open Dashboard
  - Open Recent Notes
  - Pause Capture
  - Preferences
  - Quit

### First Launch
1. Welcome screen explaining what it does
2. Auto-detect if Claude Code CLI is installed
3. Configure `~/.mcp.json` (backup existing first)
4. Optionally set up teams/projects
5. Ready to go

### Dashboard
- Same web UI from CLI version
- Opens in default browser or embedded webview

### Background Service
- MCP server runs as background process
- Starts on login (optional)
- Low memory footprint

## Tech Stack Options

### Option 1: Electron
- Pros: Familiar, lots of examples, easy Node integration
- Cons: ~100MB bundle size

### Option 2: Tauri
- Pros: ~10MB bundle size, Rust backend, modern
- Cons: Learning curve, need to bridge to Node for MCP

### Option 3: Swift + bundled Node
- Pros: Native feel, small wrapper
- Cons: More complex build process

**Recommendation:** Start with Electron for speed, consider Tauri later for size.

## Project Structure

```
contextbuddy-standalone/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # App entry point
│   │   ├── tray.ts     # Menu bar/tray icon
│   │   ├── config.ts   # Manage ~/.mcp.json
│   │   └── server.ts   # Start MCP server
│   ├── renderer/       # UI (if using webview)
│   │   └── preferences/
│   └── mcp/            # Bundled MCP server (from contextbuddy)
├── assets/
│   ├── icon.png
│   ├── iconTemplate.png  # macOS menu bar icon
│   └── iconTemplate@2x.png
├── package.json
├── electron-builder.yml
└── README.md
```

## Security Model

Same as CLI version:
- All data in `~/.contextbuddy/` (or app-specific location)
- No cloud sync, no external services
- No network access except localhost for web UI

**New behaviors:**
- Writes to `~/.mcp.json` (with backup)
- Registers as login item (optional, with permission)

## Development Roadmap

### Phase 1: Basic Menu Bar App
- [ ] Electron app skeleton
- [ ] Menu bar icon with basic menu
- [ ] Bundle MCP server from contextbuddy
- [ ] Start/stop server

### Phase 2: Auto-Configuration
- [ ] Detect Claude Code CLI
- [ ] Read/write ~/.mcp.json
- [ ] Backup existing config
- [ ] First-run wizard

### Phase 3: Dashboard Integration
- [ ] Open web UI in browser
- [ ] Or: embedded webview

### Phase 4: Polish
- [ ] Login item support
- [ ] Auto-update
- [ ] Notarization for macOS
- [ ] DMG installer

## Building

```bash
npm install
npm run dev      # Development mode
npm run build    # Build .app
npm run dist     # Create DMG
```

## Requirements

- macOS 12+
- Claude Code CLI (for chat functionality)

## Related

- [ContextBuddy CLI](https://github.com/axel-karlsson-nn/contextbuddy) - The original MCP server

## License

MIT
