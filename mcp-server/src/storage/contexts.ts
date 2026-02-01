import * as path from 'path';
import { Teams, Projects, Team, Project, Config } from '../types.js';
import {
  CONTEXTS_DIR,
  CONFIG_PATH,
  readJsonFile,
  writeJsonFile,
  ensureStorageStructure
} from './index.js';

const TEAMS_PATH = path.join(CONTEXTS_DIR, 'teams.json');
const PROJECTS_PATH = path.join(CONTEXTS_DIR, 'projects.json');

export function getConfig(): Config {
  return readJsonFile<Config>(CONFIG_PATH, {
    version: '1.0',
    defaultTeam: null,
    autoCapture: 'aggressive',
    createdAt: new Date().toISOString()
  });
}

export function saveConfig(config: Config): void {
  writeJsonFile(CONFIG_PATH, config);
}

export function initializeStorage(): Config {
  ensureStorageStructure();

  const existingConfig = readJsonFile<Config | null>(CONFIG_PATH, null);
  if (existingConfig) {
    return existingConfig;
  }

  const config: Config = {
    version: '1.0',
    defaultTeam: null,
    autoCapture: 'aggressive',
    createdAt: new Date().toISOString()
  };

  saveConfig(config);
  writeJsonFile(TEAMS_PATH, {});
  writeJsonFile(PROJECTS_PATH, {});

  return config;
}

export function getTeams(): Teams {
  return readJsonFile<Teams>(TEAMS_PATH, {});
}

export function getProjects(): Projects {
  return readJsonFile<Projects>(PROJECTS_PATH, {});
}

export function addTeam(id: string, name: string, description?: string): Team {
  const teams = getTeams();
  const team: Team = {
    name,
    description,
    createdAt: new Date().toISOString()
  };
  teams[id] = team;
  writeJsonFile(TEAMS_PATH, teams);
  return team;
}

export function addProject(id: string, name: string, team?: string, description?: string): Project {
  const projects = getProjects();
  const project: Project = {
    name,
    team,
    description,
    createdAt: new Date().toISOString()
  };
  projects[id] = project;
  writeJsonFile(PROJECTS_PATH, projects);
  return project;
}

export function updateTeam(id: string, updates: Partial<Omit<Team, 'createdAt'>>): Team | null {
  const teams = getTeams();
  if (!teams[id]) {
    return null;
  }
  teams[id] = { ...teams[id], ...updates };
  writeJsonFile(TEAMS_PATH, teams);
  return teams[id];
}

export function getTeamById(id: string): Team | null {
  const teams = getTeams();
  return teams[id] || null;
}

export function listContexts(): { teams: Teams; projects: Projects } {
  return {
    teams: getTeams(),
    projects: getProjects()
  };
}
