import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { app } from 'electron';

let mcpProcess: ChildProcess | null = null;
let webProcess: ChildProcess | null = null;

/**
 * Get the path to the bundled MCP server
 */
function getMcpServerPath(): string {
  if (app.isPackaged) {
    // In production, use the bundled server
    return path.join(process.resourcesPath, 'mcp-server', 'dist', 'index.js');
  } else {
    // In development, point to the original contextbuddy
    return '/Users/axekar/contextbuddy/dist/index.js';
  }
}

/**
 * Get the path to the web server
 */
function getWebServerPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'mcp-server', 'web', 'server.js');
  } else {
    return '/Users/axekar/contextbuddy/web/server.js';
  }
}

/**
 * Start the MCP server process
 * Note: The MCP server is started by Claude Code via the mcp.json config
 * We only need to start the web UI server here
 */
export async function startMcpServer(): Promise<void> {
  if (webProcess) {
    console.log('Web server already running');
    return;
  }

  const webServerPath = getWebServerPath();

  webProcess = spawn('node', [webServerPath], {
    stdio: 'pipe',
    env: { ...process.env },
  });

  webProcess.stdout?.on('data', (data) => {
    console.log(`[web] ${data}`);
  });

  webProcess.stderr?.on('data', (data) => {
    console.error(`[web] ${data}`);
  });

  webProcess.on('close', (code) => {
    console.log(`Web server exited with code ${code}`);
    webProcess = null;
  });

  console.log('Web server started on http://localhost:3333');
}

/**
 * Stop the MCP server process
 */
export async function stopMcpServer(): Promise<void> {
  if (webProcess) {
    webProcess.kill();
    webProcess = null;
    console.log('Web server stopped');
  }
}

/**
 * Check if the server is running
 */
export function isServerRunning(): boolean {
  return webProcess !== null;
}
