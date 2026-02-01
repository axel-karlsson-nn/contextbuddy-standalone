import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { app, dialog } from 'electron';
import { getMcpServerPath } from './paths';

const MCP_JSON_PATH = path.join(os.homedir(), '.mcp.json');
const BACKUP_SUFFIX = '.backup';

interface McpConfig {
  mcpServers?: {
    [key: string]: {
      command: string;
      args: string[];
    };
  };
}

/**
 * Check if Claude Code CLI is installed
 */
export async function checkClaudeCodeInstalled(): Promise<boolean> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    await execAsync('which claude');
    return true;
  } catch {
    return false;
  }
}

/**
 * Read existing mcp.json config
 */
function readMcpConfig(): McpConfig {
  try {
    if (fs.existsSync(MCP_JSON_PATH)) {
      const content = fs.readFileSync(MCP_JSON_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading mcp.json:', error);
  }
  return {};
}

/**
 * Write mcp.json config
 */
function writeMcpConfig(config: McpConfig): void {
  fs.writeFileSync(MCP_JSON_PATH, JSON.stringify(config, null, 2));
}

/**
 * Backup existing mcp.json
 */
function backupMcpConfig(): void {
  if (fs.existsSync(MCP_JSON_PATH)) {
    const backupPath = MCP_JSON_PATH + BACKUP_SUFFIX;
    fs.copyFileSync(MCP_JSON_PATH, backupPath);
    console.log(`Backed up existing config to ${backupPath}`);
  }
}

/**
 * Configure ~/.mcp.json to include ContextBuddy
 */
export async function configureMcpJson(): Promise<void> {
  const config = readMcpConfig();

  // Check if already configured
  if (config.mcpServers?.contextbuddy) {
    const result = await dialog.showMessageBox({
      type: 'question',
      buttons: ['Update', 'Keep Current', 'Cancel'],
      defaultId: 0,
      title: 'ContextBuddy Already Configured',
      message: 'ContextBuddy is already in your Claude Code config.',
      detail: 'Do you want to update it to use this app\'s bundled server?',
    });

    if (result.response === 2) {
      return; // Cancel
    }
    if (result.response === 1) {
      return; // Keep current
    }
  }

  // Backup before modifying
  backupMcpConfig();

  // Add/update ContextBuddy config
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  config.mcpServers.contextbuddy = {
    command: 'node',
    args: [getMcpServerPath()],
  };

  writeMcpConfig(config);

  await dialog.showMessageBox({
    type: 'info',
    title: 'Configuration Complete',
    message: 'ContextBuddy has been added to Claude Code.',
    detail: `Config saved to ${MCP_JSON_PATH}\n\nYou can now run 'claude' in any terminal to use ContextBuddy.`,
  });
}

/**
 * Remove ContextBuddy from mcp.json
 */
export async function unconfigureMcpJson(): Promise<void> {
  const config = readMcpConfig();

  if (config.mcpServers?.contextbuddy) {
    delete config.mcpServers.contextbuddy;
    writeMcpConfig(config);
    console.log('Removed ContextBuddy from mcp.json');
  }
}
