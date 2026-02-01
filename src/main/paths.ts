import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

/**
 * Load environment variables from .env.local (for development)
 */
function loadEnvLocal(): void {
  if (app.isPackaged) return;

  const envPath = path.join(__dirname, '../../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Load env on module import
loadEnvLocal();

/**
 * Get the base ContextBuddy path
 * - In production: bundled in app resources
 * - In development: from CONTEXTBUDDY_PATH env var
 */
export function getContextBuddyPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'mcp-server');
  }

  const envPath = process.env.CONTEXTBUDDY_PATH;
  if (!envPath) {
    throw new Error(
      'CONTEXTBUDDY_PATH not set. Create .env.local with:\nCONTEXTBUDDY_PATH=/path/to/your/contextbuddy'
    );
  }
  return envPath;
}

/**
 * Get the path to the MCP server entry point
 */
export function getMcpServerPath(): string {
  return path.join(getContextBuddyPath(), 'dist', 'index.js');
}

/**
 * Get the path to the web server
 */
export function getWebServerPath(): string {
  return path.join(getContextBuddyPath(), 'web', 'server.js');
}
