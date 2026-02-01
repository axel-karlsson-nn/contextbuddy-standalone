import { app, BrowserWindow, Tray, Menu, nativeImage, shell } from 'electron';
import * as path from 'path';
import { startMcpServer, stopMcpServer } from './server';
import { configureMcpJson, checkClaudeCodeInstalled } from './config';

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let serverRunning = false;

// Hide dock icon - we're a menu bar app
app.dock?.hide();

function createTray() {
  // Use template image for macOS menu bar (auto dark/light mode)
  const iconPath = path.join(__dirname, '../../assets/iconTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  tray.setToolTip('ContextBuddy');

  updateTrayMenu();
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'ContextBuddy',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => openDashboard(),
    },
    {
      label: serverRunning ? 'Server: Running ✓' : 'Server: Stopped',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: serverRunning ? 'Stop Server' : 'Start Server',
      click: () => toggleServer(),
    },
    {
      label: 'Configure Claude Code...',
      click: () => configureMcpJson(),
    },
    { type: 'separator' },
    {
      label: 'Preferences...',
      click: () => openPreferences(),
    },
    {
      label: 'About ContextBuddy',
      click: () => openAbout(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        stopMcpServer();
        app.quit();
      },
    },
  ]);

  tray?.setContextMenu(contextMenu);
}

async function toggleServer() {
  if (serverRunning) {
    await stopMcpServer();
    serverRunning = false;
  } else {
    await startMcpServer();
    serverRunning = true;
  }
  updateTrayMenu();
}

function openDashboard() {
  // Open web UI in default browser
  shell.openExternal('http://localhost:3333');
}

function openPreferences() {
  // TODO: Open preferences window
  console.log('Preferences not yet implemented');
}

function openAbout() {
  // TODO: Open about window
  console.log('About not yet implemented');
}

async function firstRunSetup() {
  const claudeInstalled = await checkClaudeCodeInstalled();

  if (!claudeInstalled) {
    // TODO: Show dialog explaining Claude Code is needed
    console.log('Claude Code CLI not found');
  }

  // Configure ~/.mcp.json
  await configureMcpJson();
}

app.whenReady().then(async () => {
  // Check if first run
  const isFirstRun = !app.isPackaged; // TODO: Check actual first run state

  if (isFirstRun) {
    await firstRunSetup();
  }

  createTray();

  // Auto-start MCP server
  await startMcpServer();
  serverRunning = true;
  updateTrayMenu();
});

app.on('window-all-closed', () => {
  // Don't quit - we're a menu bar app
});

app.on('before-quit', () => {
  stopMcpServer();
});
