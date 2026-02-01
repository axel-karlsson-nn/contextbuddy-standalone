import { app, Tray, Menu, nativeImage, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { startMcpServer, stopMcpServer } from './server';
import { configureMcpJson, checkClaudeCodeInstalled } from './config';
import { configExists, writeConfig, getContextBuddyPath, getConfigFile } from './paths';

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
  const iconPath = getAssetPath('iconTemplate.png');
  let icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    console.log('Icon not found at:', iconPath);
    icon = nativeImage.createFromBuffer(Buffer.alloc(0));
  }

  tray = new Tray(icon);
  tray.setToolTip('ContextBuddy');

  updateTrayMenu();
}

function updateTrayMenu() {
  const cbPath = getContextBuddyPath();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'ContextBuddy',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => openDashboard(),
      enabled: serverRunning,
    },
    {
      label: serverRunning ? '● Server Running' : '○ Server Stopped',
      enabled: false,
    },
    {
      label: cbPath ? `Path: ${cbPath}` : 'Path: Not configured',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: serverRunning ? 'Stop Server' : 'Start Server',
      click: () => toggleServer(),
      enabled: cbPath !== null,
    },
    {
      label: 'Change ContextBuddy Path...',
      click: () => promptForPath(),
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
    const success = await startMcpServer();
    serverRunning = success;
  }
  updateTrayMenu();
}

function openDashboard() {
  shell.openExternal('http://localhost:3333');
}

async function showAbout() {
  const cbPath = getContextBuddyPath();
  await dialog.showMessageBox({
    type: 'info',
    title: 'About ContextBuddy',
    message: 'ContextBuddy Standalone',
    detail: `Version 0.1.0\n\nA menu bar companion for ContextBuddy.\nWorks with Claude Code CLI.\n\nPath: ${cbPath || 'Not configured'}`,
  });
}

async function promptForPath(): Promise<boolean> {
  const result = await dialog.showOpenDialog({
    title: 'Select your ContextBuddy folder',
    message: 'Choose the folder containing your ContextBuddy installation (with dist/, web/, .data/)',
    properties: ['openDirectory'],
    buttonLabel: 'Select Folder',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return false;
  }

  const selectedPath = result.filePaths[0];

  // Validate the folder has the required structure
  const requiredFiles = ['dist/index.js', 'web/server.js'];
  const missing = requiredFiles.filter(f => !fs.existsSync(path.join(selectedPath, f)));

  if (missing.length > 0) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Invalid Folder',
      message: 'This folder doesn\'t look like a ContextBuddy installation.',
      detail: `Missing: ${missing.join(', ')}\n\nMake sure you select a folder with dist/ and web/ subdirectories.`,
    });
    return false;
  }

  // Save the config
  writeConfig({ contextBuddyPath: selectedPath });

  await dialog.showMessageBox({
    type: 'info',
    title: 'Configuration Saved',
    message: 'ContextBuddy path configured!',
    detail: `Path: ${selectedPath}\n\nConfig saved to:\n${getConfigFile()}`,
  });

  // Restart server with new path
  if (serverRunning) {
    await stopMcpServer();
  }
  const success = await startMcpServer();
  serverRunning = success;
  updateTrayMenu();

  return true;
}

async function firstRunSetup(): Promise<boolean> {
  // Check if path is configured
  if (app.isPackaged && !configExists()) {
    await dialog.showMessageBox({
      type: 'info',
      title: 'Welcome to ContextBuddy',
      message: 'Let\'s set up ContextBuddy!',
      detail: 'First, select the folder where your ContextBuddy installation is located.\n\nThis is the folder containing your notes (.data/), the server (dist/), and web UI (web/).',
    });

    const configured = await promptForPath();
    if (!configured) {
      await dialog.showMessageBox({
        type: 'warning',
        title: 'Setup Incomplete',
        message: 'ContextBuddy needs a folder to work.',
        detail: 'You can configure it later from the menu bar icon.',
      });
      return false;
    }
  }

  return true;
}

app.whenReady().then(async () => {
  createTray();

  // First-run setup
  const setupComplete = await firstRunSetup();

  if (setupComplete && getContextBuddyPath()) {
    // Auto-start web server
    try {
      const success = await startMcpServer();
      serverRunning = success;
      updateTrayMenu();

      if (success) {
        console.log('ContextBuddy started successfully');
      }
    } catch (error) {
      console.error('Failed to start server:', error);
      await dialog.showMessageBox({
        type: 'error',
        title: 'Server Error',
        message: 'Failed to start ContextBuddy server',
        detail: String(error),
      });
    }
  }
});

app.on('window-all-closed', () => {
  // Don't quit - we're a menu bar app
});

app.on('before-quit', () => {
  stopMcpServer();
});
