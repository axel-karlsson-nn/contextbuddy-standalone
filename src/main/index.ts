import { app, Tray, Menu, nativeImage, shell, dialog } from 'electron';
import * as path from 'path';
import { startMcpServer, stopMcpServer } from './server';
import { configureMcpJson, checkClaudeCodeInstalled } from './config';

let tray: Tray | null = null;
let serverRunning = false;

// Hide dock icon - we're a menu bar app
if (app.dock) {
  app.dock.hide();
}

function getAssetPath(asset: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', asset);
  }
  return path.join(__dirname, '../../assets', asset);
}

function createTray() {
  // Use template image for macOS menu bar (auto dark/light mode)
  const iconPath = getAssetPath('iconTemplate.png');
  let icon = nativeImage.createFromPath(iconPath);

  // Fallback if icon doesn't load
  if (icon.isEmpty()) {
    console.log('Icon not found at:', iconPath);
    // Create a simple colored icon as fallback
    icon = nativeImage.createFromBuffer(Buffer.alloc(0));
  }

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
      label: serverRunning ? '● Server Running' : '○ Server Stopped',
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
      label: 'About ContextBuddy',
      click: () => showAbout(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'Command+Q',
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
  shell.openExternal('http://localhost:3333');
}

async function showAbout() {
  await dialog.showMessageBox({
    type: 'info',
    title: 'About ContextBuddy',
    message: 'ContextBuddy Standalone',
    detail: 'Version 0.1.0\n\nA menu bar companion for ContextBuddy.\nWorks with Claude Code CLI.',
  });
}

async function firstRunSetup() {
  const claudeInstalled = await checkClaudeCodeInstalled();

  if (!claudeInstalled) {
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Claude Code Not Found',
      message: 'Claude Code CLI is not installed.',
      detail: 'ContextBuddy works best with Claude Code CLI.\n\nVisit https://claude.ai/claude-code to install it.',
      buttons: ['Open Install Page', 'Continue Anyway'],
    });

    if (result.response === 0) {
      shell.openExternal('https://claude.ai/claude-code');
    }
  }

  // Offer to configure
  const configResult = await dialog.showMessageBox({
    type: 'question',
    title: 'Configure Claude Code',
    message: 'Would you like to configure Claude Code to use ContextBuddy?',
    detail: 'This will add ContextBuddy to your ~/.mcp.json file.',
    buttons: ['Configure Now', 'Later'],
  });

  if (configResult.response === 0) {
    await configureMcpJson();
  }
}

app.whenReady().then(async () => {
  createTray();

  // Check if first run (simple check - could be improved)
  const isFirstRun = process.env.CB_FIRST_RUN === '1' || !app.isPackaged;

  if (isFirstRun) {
    await firstRunSetup();
  }

  // Auto-start web server
  try {
    await startMcpServer();
    serverRunning = true;
    updateTrayMenu();
    console.log('ContextBuddy started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    await dialog.showMessageBox({
      type: 'error',
      title: 'Server Error',
      message: 'Failed to start ContextBuddy server',
      detail: String(error),
    });
  }
});

app.on('window-all-closed', () => {
  // Don't quit - we're a menu bar app
});

app.on('before-quit', () => {
  stopMcpServer();
});
