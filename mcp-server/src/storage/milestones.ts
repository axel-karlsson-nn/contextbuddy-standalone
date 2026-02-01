import * as path from 'path';
import { Milestone, MilestoneStatus } from '../types.js';
import {
  STORAGE_DIR,
  readJsonFile,
  writeJsonFile,
  ensureDir
} from './index.js';

const MILESTONES_PATH = path.join(STORAGE_DIR, 'milestones.json');

export function getMilestones(): Milestone[] {
  return readJsonFile<Milestone[]>(MILESTONES_PATH, []);
}

export function getMilestonesByProject(projectId: string): Milestone[] {
  return getMilestones().filter(m => m.projectId === projectId);
}

export function addMilestone(milestone: Omit<Milestone, 'id' | 'createdAt' | 'status'>): Milestone {
  const milestones = getMilestones();
  const id = `milestone-${Date.now()}`;
  const newMilestone: Milestone = {
    id,
    ...milestone,
    status: 'planned',
    createdAt: new Date().toISOString()
  };
  milestones.push(newMilestone);
  writeJsonFile(MILESTONES_PATH, milestones);
  return newMilestone;
}

export function updateMilestone(id: string, updates: Partial<Omit<Milestone, 'id' | 'createdAt'>>): Milestone | null {
  const milestones = getMilestones();
  const index = milestones.findIndex(m => m.id === id);
  if (index === -1) {
    return null;
  }
  milestones[index] = { ...milestones[index], ...updates };
  writeJsonFile(MILESTONES_PATH, milestones);
  return milestones[index];
}

export function getMilestoneById(id: string): Milestone | null {
  const milestones = getMilestones();
  return milestones.find(m => m.id === id) || null;
}
