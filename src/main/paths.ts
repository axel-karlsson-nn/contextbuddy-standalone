import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { app } from 'electron';

// Config file location
const CONFIG_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'ContextBuddy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface AppConfig {
  dataPath: string;  // Where .data/ lives (user's notes)
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
 * Read config from Application Support
 */
function readConfig(): AppConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content);
      // Support both old format (contextBuddyPath) and new format (dataPath)
      if (config.contextBuddyPath && !config.dataPath) {
        config.dataPath = config.contextBuddyPath;
      }
      return config;
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
 * Get the path to the bundled MCP server
 * - In production: bundled in app resources
 * - In development: from CONTEXTBUDDY_PATH env var or local mcp-server/
 */
export function getMcpServerBasePath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'mcp-server');
  }

  // In development, check for env var first, then fall back to local mcp-server
  const envPath = process.env.CONTEXTBUDDY_PATH;
  if (envPath) {
    return envPath;
  }

  // Fall back to local mcp-server directory
  return path.join(__dirname, '../../mcp-server');
}

/**
 * Get the data path (where .data/ lives)
 * - In production: from config file (user-selected)
 * - In development: from CONTEXTBUDDY_PATH env var
 */
export function getDataPath(): string | null {
  if (app.isPackaged) {
    const config = readConfig();
    return config?.dataPath || null;
  }

  // In development, use CONTEXTBUDDY_PATH
  return process.env.CONTEXTBUDDY_PATH || null;
}

/**
 * Get the path to the MCP server entry point
 */
export function getMcpServerPath(): string {
  return path.join(getMcpServerBasePath(), 'dist', 'index.js');
}

/**
 * Get the path to the web server
 */
export function getWebServerPath(): string {
  return path.join(getMcpServerBasePath(), 'web', 'server.js');
}

/**
 * Set the data path in config
 */
export function setDataPath(dataPath: string): void {
  writeConfig({ dataPath });
}
