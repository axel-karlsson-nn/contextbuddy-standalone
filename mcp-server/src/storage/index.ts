import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the installation directory (where the MCP server lives)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Navigate from dist/storage/ up to project root, then to .data/
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// Support custom data path via environment variable
export const STORAGE_DIR = process.env.CONTEXTBUDDY_DATA_PATH
  ? path.join(process.env.CONTEXTBUDDY_DATA_PATH, '.data')
  : path.join(PROJECT_ROOT, '.data');
export const CONFIG_PATH = path.join(STORAGE_DIR, 'config.json');
export const CONTEXTS_DIR = path.join(STORAGE_DIR, 'contexts');
export const NOTES_DIR = path.join(STORAGE_DIR, 'notes');

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function ensureStorageStructure(): void {
  ensureDir(STORAGE_DIR);
  ensureDir(CONTEXTS_DIR);
  ensureDir(NOTES_DIR);
}

export function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

export function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function storageExists(): boolean {
  return fs.existsSync(STORAGE_DIR) && fs.existsSync(CONFIG_PATH);
}
