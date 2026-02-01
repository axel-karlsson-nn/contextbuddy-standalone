# ContextBuddy Standalone

A macOS menu bar app that makes ContextBuddy zero-config. Companion app for Claude Code CLI.

## Security Model

**Your data stays where YOU put it.**

- You choose the folder containing your notes
- App only accesses that ONE folder
- Config stored in `~/Library/Application Support/ContextBuddy/config.json`
- No cloud sync, no network access (except localhost:3333 for dashboard)
- No telemetry, no analytics
- Fully auditable source code

## How It Works

```
┌─────────────────────────────────────┐
│  ContextBuddy.app (Menu Bar)        │
├─────────────────────────────────────┤
│  • Starts web dashboard             │
│  • Menu bar quick access            │
│  • Points to YOUR folder            │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Your ContextBuddy Folder           │
│  (you choose the location)          │
├─────────────────────────────────────┤
│  ├── .data/        ← Your notes     │
│  ├── dist/         ← MCP server     │
│  └── web/          ← Dashboard      │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Claude Code CLI                    │
│  (run from your folder)             │
└─────────────────────────────────────┘
```

## Installation

### Prerequisites

- macOS 12+
- Node.js 18+
- [Claude Code CLI](https://claude.ai/code)

### Build the App

```bash
# Clone the repository
git clone https://github.com/axel-karlsson-nn/contextbuddy-standalone.git
cd contextbuddy-standalone

# Install dependencies
npm install

# Build the macOS app
npm run dist:mac

# Copy to Applications
cp -r dist/mac-arm64/ContextBuddy.app /Applications/
```

### Set Up Your ContextBuddy Folder

You need a folder with the ContextBuddy MCP server. Either:

**Option A: Clone the main repo**
```bash
git clone https://github.com/axel-karlsson-nn/contextbuddy.git ~/ContextBuddy
cd ~/ContextBuddy
npm install
npm run build
```

**Option B: Use existing installation**
If you already have ContextBuddy set up somewhere, just point to that folder.

### First Run

1. Open `ContextBuddy.app` from Applications
2. Select your ContextBuddy folder when prompted
3. App validates the folder structure (needs `dist/` and `web/`)
4. Config saved to `~/Library/Application Support/ContextBuddy/config.json`
5. Web server starts automatically

## Usage

### Menu Bar

Click the menu bar icon to:
- **Open Dashboard** - View notes in browser
- **Start/Stop Server** - Control the web server
- **Change Path** - Point to a different folder

### With Claude Code

```bash
cd ~/ContextBuddy  # or wherever your folder is
claude
```

The folder has its own `.mcp.json` that configures Claude Code to use ContextBuddy.

## Configuration

Config file: `~/Library/Application Support/ContextBuddy/config.json`

```json
{
  "contextBuddyPath": "/path/to/your/contextbuddy/folder"
}
```

You can edit this manually or use "Change ContextBuddy Path..." from the menu.

## Development

```bash
# Install dependencies
npm install

# Create .env.local with your dev path
echo "CONTEXTBUDDY_PATH=/path/to/your/contextbuddy" > .env.local

# Run in development mode
npm run dev

# Build for production
npm run dist:mac
```

### Project Structure

```
contextbuddy-standalone/
├── src/main/
│   ├── index.ts      # Electron entry, menu bar
│   ├── server.ts     # Start/stop web server
│   ├── config.ts     # Claude Code config
│   └── paths.ts      # Path management
├── assets/           # Menu bar icons
├── .env.example      # Template for dev config
└── package.json
```

## Why Not Pre-built Releases?

Pre-built macOS apps need to be signed and notarized with an Apple Developer certificate ($99/year) to run without security warnings.

Building from source:
- Is more transparent (you can audit the code)
- Doesn't require trusting a pre-built binary
- Works without Apple Developer signing

## Related

- [ContextBuddy](https://github.com/axel-karlsson-nn/contextbuddy) - The MCP server and CLI tool

## License

MIT
