import { app, Tray, Menu, nativeImage, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { startMcpServer, stopMcpServer } from './server';
import { configExists, setDataPath, getDataPath, getConfigFile, getMcpServerBasePath } from './paths';

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
  const dataPath = getDataPath();

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
    { type: 'separator' },
    {
      label: dataPath ? `Data: ${dataPath}` : 'Data folder not set',
      enabled: false,
    },
    {
      label: serverRunning ? 'Stop Server' : 'Start Server',
      click: () => toggleServer(),
      enabled: dataPath !== null,
    },
    {
      label: 'Change Data Folder...',
      click: () => promptForDataPath(),
    },
    { type: 'separator' },
    {
      label: 'Set Up Claude Code...',
      click: () => setupClaudeCode(),
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
  const dataPath = getDataPath();
  await dialog.showMessageBox({
    type: 'info',
    title: 'About ContextBuddy',
    message: 'ContextBuddy',
    detail: `Version 0.1.0\n\nA note-taking companion for Claude Code.\n\nData folder: ${dataPath || 'Not configured'}\nMCP Server: ${getMcpServerBasePath()}`,
  });
}

async function promptForDataPath(): Promise<boolean> {
  const result = await dialog.showOpenDialog({
    title: 'Select folder for your notes',
    message: 'Choose where to store your ContextBuddy notes (.data folder will be created here)',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Select Folder',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return false;
  }

  const selectedPath = result.filePaths[0];

  // Create .data folder if it doesn't exist
  const dataFolder = path.join(selectedPath, '.data');
  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
  }

  // Save the config
  setDataPath(selectedPath);

  await dialog.showMessageBox({
    type: 'info',
    title: 'Configuration Saved',
    message: 'Data folder configured!',
    detail: `Your notes will be stored in:\n${dataFolder}\n\nConfig saved to:\n${getConfigFile()}`,
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

async function setupClaudeCode() {
  const dataPath = getDataPath();
  if (!dataPath) {
    await dialog.showMessageBox({
      type: 'warning',
      title: 'Set Up Data Folder First',
      message: 'Please select a data folder first.',
      detail: 'Click "Change Data Folder..." to set up where your notes will be stored.',
    });
    return;
  }

  const mcpServerPath = path.join(getMcpServerBasePath(), 'dist', 'index.js');
  const mcpJsonPath = path.join(dataPath, '.mcp.json');

  // Create .mcp.json in the data folder
  const mcpConfig = {
    mcpServers: {
      contextbuddy: {
        command: 'node',
        args: [mcpServerPath],
        env: {
          CONTEXTBUDDY_DATA_PATH: dataPath
        }
      }
    }
  };

  fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2));

  await dialog.showMessageBox({
    type: 'info',
    title: 'Claude Code Configured',
    message: 'Claude Code is ready to use!',
    detail: `Created ${mcpJsonPath}\n\nTo use ContextBuddy with Claude:\n\n1. cd ${dataPath}\n2. claude\n\nRun Claude from that folder to capture notes.`,
  });
}

async function firstRunSetup(): Promise<boolean> {
  if (app.isPackaged && !configExists()) {
    await dialog.showMessageBox({
      type: 'info',
      title: 'Welcome to ContextBuddy',
      message: 'Let\'s set up ContextBuddy!',
      detail: 'First, choose where to store your notes.\n\nThis will create a .data folder in your selected location.',
    });

    const configured = await promptForDataPath();
    if (!configured) {
      await dialog.showMessageBox({
        type: 'warning',
        title: 'Setup Incomplete',
        message: 'ContextBuddy needs a data folder to work.',
        detail: 'You can configure it later from the menu bar icon.',
      });
      return false;
    }

    // Offer to set up Claude Code
    const setupClaude = await dialog.showMessageBox({
      type: 'question',
      title: 'Set Up Claude Code?',
      message: 'Would you like to configure Claude Code now?',
      detail: 'This will create a .mcp.json file so you can use ContextBuddy with Claude.',
      buttons: ['Set Up Now', 'Later'],
    });

    if (setupClaude.response === 0) {
      await setupClaudeCode();
    }
  }

  return true;
}

app.whenReady().then(async () => {
  createTray();

  // First-run setup
  const setupComplete = await firstRunSetup();

  if (setupComplete && getDataPath()) {
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
