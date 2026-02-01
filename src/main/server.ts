import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { getWebServerPath, getDataPath, getMcpServerBasePath } from './paths';

let webProcess: ChildProcess | null = null;

/**
 * Start the web server process
 * Returns true if started successfully, false otherwise
 */
export async function startMcpServer(): Promise<boolean> {
  if (webProcess) {
    console.log('Web server already running');
    return true;
  }

  const webServerPath = getWebServerPath();
  const dataPath = getDataPath();
  const mcpBasePath = getMcpServerBasePath();

  if (!dataPath) {
    console.error('Data path not configured');
    return false;
  }

  console.log('Starting web server from:', webServerPath);
  console.log('Data path:', dataPath);
  console.log('MCP server base:', mcpBasePath);

  try {
    // Pass DATA_PATH env var so the web server knows where .data/ is
    webProcess = spawn('node', [webServerPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CONTEXTBUDDY_DATA_PATH: dataPath,
      },
      cwd: mcpBasePath,
      detached: false,
    });

    webProcess.stdout?.on('data', (data) => {
      console.log(`[web] ${data.toString().trim()}`);
    });

    webProcess.stderr?.on('data', (data) => {
      console.error(`[web] ${data.toString().trim()}`);
    });

    webProcess.on('close', (code) => {
      console.log(`Web server exited with code ${code}`);
      webProcess = null;
    });

    webProcess.on('error', (error) => {
      console.error('Failed to start web server:', error);
      webProcess = null;
    });

    // Wait a bit to see if it crashes immediately
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (webProcess === null) {
      console.error('Web server crashed on startup');
      return false;
    }

    console.log('Web server started on http://localhost:3333');
    return true;
  } catch (error) {
    console.error('Error starting web server:', error);
    return false;
  }
}

/**
 * Stop the web server process
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
