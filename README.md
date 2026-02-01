# ContextBuddy

A macOS menu bar app for note-taking and decision-tracking with Claude Code. Captures your decisions, action items, and ideas as you work.

## Security Model

**Your data stays where YOU put it.**

- You choose the folder for your notes
- App only accesses that ONE folder's `.data/` subdirectory
- Config stored in `~/Library/Application Support/ContextBuddy/config.json`
- No cloud sync, no network access (except localhost:3333 for dashboard)
- No telemetry, no analytics
- Fully auditable source code

## Features

- **Menu Bar App** - Always accessible, never in your way
- **Ambient Capture** - Just talk naturally, notes are captured automatically
- **Web Dashboard** - Browse and search your notes at localhost:3333
- **Claude Code Integration** - Works seamlessly with Claude Code CLI
- **Fully Local** - All data stays on your machine

## Installation

### Prerequisites

- macOS 12+
- Node.js 18+
- [Claude Code CLI](https://claude.ai/code)

### Build from Source

```bash
# Clone the repository
git clone https://github.com/axel-karlsson-nn/contextbuddy-standalone.git
cd contextbuddy-standalone

# Install dependencies (also installs MCP server deps)
npm install

# Build everything (MCP server + Electron app)
npm run build

# Create the macOS app
npm run dist:mac

# Copy to Applications
cp -r dist/mac-arm64/ContextBuddy.app /Applications/
```

### First Run

1. Open `ContextBuddy.app` from Applications
2. Choose where to store your notes (creates `.data/` folder there)
3. Optionally set up Claude Code integration
4. Done! Dashboard starts automatically

## Usage

### Menu Bar

Click the menu bar icon to:
- **Open Dashboard** - View notes in browser (localhost:3333)
- **Start/Stop Server** - Control the web server
- **Change Data Folder** - Point to a different location
- **Set Up Claude Code** - Configure Claude to use ContextBuddy

### With Claude Code

After setup, your data folder has a `.mcp.json` file. Run Claude from there:

```bash
cd ~/YourDataFolder  # wherever you chose
claude
```

Talk naturally - ContextBuddy captures decisions, TODOs, and ideas automatically:

> "We decided to use PostgreSQL for the new service"
> → Captured as a decision

> "TODO: Review the PR by Friday"
> → Captured as an action item

### Web Dashboard

Open the dashboard to:
- Browse all your notes
- Filter by type, team, project
- Search across everything
- Edit notes inline
- View planning tickets and roadmap

## How It Works

```
┌─────────────────────────────────────┐
│  ContextBuddy.app (Menu Bar)        │
│  Contains bundled MCP server        │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Your Data Folder (you choose)      │
├─────────────────────────────────────┤
│  ├── .data/        ← Your notes     │
│  └── .mcp.json     ← Claude config  │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Claude Code CLI                    │
│  cd YourDataFolder && claude        │
└─────────────────────────────────────┘
```

## Configuration

### App Config

Location: `~/Library/Application Support/ContextBuddy/config.json`

```json
{
  "dataPath": "/path/to/your/data/folder"
}
```

### Claude Code Config

Location: `<YourDataFolder>/.mcp.json` (created by "Set Up Claude Code")

## Development

```bash
# Install dependencies
npm install

# Create .env.local with your dev data path
echo "CONTEXTBUDDY_PATH=/path/to/test/folder" > .env.local

# Run in development mode
npm run dev

# Build for production
npm run dist:mac
```

### Project Structure

```
contextbuddy-standalone/
├── src/main/           # Electron app
│   ├── index.ts        # Entry, menu bar
│   ├── server.ts       # Web server management
│   └── paths.ts        # Path configuration
├── mcp-server/         # Bundled MCP server
│   ├── src/            # TypeScript source
│   ├── web/            # Dashboard UI
│   └── skills/         # Claude Code skills
├── assets/             # Menu bar icons
└── package.json
```

## Why Build from Source?

Pre-built macOS apps need to be signed and notarized with an Apple Developer certificate ($99/year) to run without security warnings.

Building from source:
- Is more transparent (you can audit the code)
- Doesn't require trusting a pre-built binary
- Works without Apple Developer signing
- Ideal for security-conscious users

## Related

- [ContextBuddy (CLI-only)](https://github.com/axel-karlsson-nn/contextbuddy) - The original MCP server without the menu bar app

## License

MIT
