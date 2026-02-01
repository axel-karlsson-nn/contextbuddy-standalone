import { spawn, ChildProcess } from 'child_process';
import { getWebServerPath } from './paths';

let webProcess: ChildProcess | null = null;

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
  console.log('Starting web server from:', webServerPath);

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
