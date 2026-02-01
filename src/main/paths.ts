import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { app } from 'electron';

// Config file location for packaged app
const CONFIG_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'ContextBuddy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface AppConfig {
  contextBuddyPath: string;
}

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

/**
 * Read config from Application Support (for packaged app)
 */
function readConfig(): AppConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading config:', error);
  }
  return null;
}

/**
 * Write config to Application Support
 */
export function writeConfig(config: AppConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Check if config exists
 */
export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE);
}

/**
 * Get the config directory path
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Get the config file path
 */
export function getConfigFile(): string {
  return CONFIG_FILE;
}

// Load env on module import (dev mode only)
loadEnvLocal();

/**
 * Get the base ContextBuddy path
 * - In production: from ~/Library/Application Support/ContextBuddy/config.json
 * - In development: from CONTEXTBUDDY_PATH env var
 */
export function getContextBuddyPath(): string | null {
  if (app.isPackaged) {
    const config = readConfig();
    if (!config) {
      return null; // Will trigger first-run setup
    }
    return config.contextBuddyPath;
  }

  const envPath = process.env.CONTEXTBUDDY_PATH;
  if (!envPath) {
    console.error(
      'CONTEXTBUDDY_PATH not set. Create .env.local with:\nCONTEXTBUDDY_PATH=/path/to/your/contextbuddy'
    );
    return null;
  }
  return envPath;
}

/**
 * Get the path to the MCP server entry point
 */
export function getMcpServerPath(): string | null {
  const basePath = getContextBuddyPath();
  if (!basePath) return null;
  return path.join(basePath, 'dist', 'index.js');
}

/**
 * Get the path to the web server
 */
export function getWebServerPath(): string | null {
  const basePath = getContextBuddyPath();
  if (!basePath) return null;
  return path.join(basePath, 'web', 'server.js');
}
