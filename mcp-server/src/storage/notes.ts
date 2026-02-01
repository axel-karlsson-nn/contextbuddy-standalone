import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Note, NoteType, ActionStatus, SearchParams, ContextSuggestion } from '../types.js';
import { NOTES_DIR, readJsonFile, writeJsonFile, ensureDir } from './index.js';
import { getTeams, getProjects } from './contexts.js';

function getMonthlyNotesPath(date: Date = new Date()): string {
  const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return path.join(NOTES_DIR, `${yearMonth}.json`);
}

function getNotesForMonth(date: Date): Note[] {
  return readJsonFile<Note[]>(getMonthlyNotesPath(date), []);
}

function saveNotesForMonth(date: Date, notes: Note[]): void {
  ensureDir(NOTES_DIR);
  writeJsonFile(getMonthlyNotesPath(date), notes);
}

export function addNote(
  content: string,
  type: NoteType,
  options: {
    team?: string;
    project?: string;
    tags?: string[];
    assignee?: string;
    due?: string;
    status?: ActionStatus;
    ticketId?: string;
  } = {}
): Note {
  const now = new Date();
  const note: Note = {
    id: randomUUID(),
    createdAt: now.toISOString(),
    type,
    content,
    team: options.team,
    project: options.project,
    ticketId: options.ticketId,
    tags: options.tags || [],
    status: type === 'action' ? (options.status || 'open') : null,
    assignee: options.assignee,
    due: options.due
  };

  const notes = getNotesForMonth(now);
  notes.push(note);
  saveNotesForMonth(now, notes);

  return note;
}

function getAllMonthlyFiles(): string[] {
  if (!fs.existsSync(NOTES_DIR)) {
    return [];
  }
  return fs.readdirSync(NOTES_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();
}

function loadAllNotes(): Note[] {
  const files = getAllMonthlyFiles();
  const allNotes: Note[] = [];
  for (const file of files) {
    const notes = readJsonFile<Note[]>(path.join(NOTES_DIR, file), []);
    allNotes.push(...notes);
  }
  return allNotes.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function searchNotes(params: SearchParams): Note[] {
  let notes = loadAllNotes();

  if (params.team) {
    notes = notes.filter(n => n.team === params.team);
  }

  if (params.project) {
    notes = notes.filter(n => n.project === params.project);
  }

  if (params.type) {
    notes = notes.filter(n => n.type === params.type);
  }

  if (params.from) {
    const fromDate = new Date(params.from);
    notes = notes.filter(n => new Date(n.createdAt) >= fromDate);
  }

  if (params.to) {
    const toDate = new Date(params.to);
    notes = notes.filter(n => new Date(n.createdAt) <= toDate);
  }

  if (params.query) {
    const query = params.query.toLowerCase();
    notes = notes.filter(n =>
      n.content.toLowerCase().includes(query) ||
      n.tags.some(t => t.toLowerCase().includes(query))
    );
  }

  return notes;
}

export function getRecentNotes(days: number = 7): Note[] {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  return searchNotes({
    from: fromDate.toISOString()
  });
}

export function deleteNote(id: string): { deleted: boolean; note?: Note } {
  const files = getAllMonthlyFiles();

  for (const file of files) {
    const filePath = path.join(NOTES_DIR, file);
    const notes = readJsonFile<Note[]>(filePath, []);
    const noteIndex = notes.findIndex(n => n.id === id);

    if (noteIndex !== -1) {
      const [deletedNote] = notes.splice(noteIndex, 1);
      writeJsonFile(filePath, notes);
      return { deleted: true, note: deletedNote };
    }
  }

  return { deleted: false };
}

export function getLastNote(): Note | null {
  const files = getAllMonthlyFiles();

  for (const file of files) {
    const notes = readJsonFile<Note[]>(path.join(NOTES_DIR, file), []);
    if (notes.length > 0) {
      // Sort by createdAt descending and return the most recent
      notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return notes[0];
    }
  }

  return null;
}

export function suggestContext(text: string): ContextSuggestion {
  const lowerText = text.toLowerCase();
  const teams = getTeams();
  const projects = getProjects();

  let suggestedTeam: string | undefined;
  let suggestedProject: string | undefined;

  // Try to match team
  for (const [id, team] of Object.entries(teams)) {
    if (lowerText.includes(id.toLowerCase()) ||
        lowerText.includes(team.name.toLowerCase())) {
      suggestedTeam = id;
      break;
    }
  }

  // Try to match project
  for (const [id, project] of Object.entries(projects)) {
    if (lowerText.includes(id.toLowerCase()) ||
        lowerText.includes(project.name.toLowerCase())) {
      suggestedProject = id;
      if (!suggestedTeam && project.team) {
        suggestedTeam = project.team;
      }
      break;
    }
  }

  // Detect type
  let type: NoteType = 'note';
  if (lowerText.includes('decide') || lowerText.includes('decision') ||
      lowerText.includes('chose') || lowerText.includes('agreed')) {
    type = 'decision';
  } else if (lowerText.includes('todo') || lowerText.includes('action') ||
             lowerText.includes('need to') || lowerText.includes('should')) {
    type = 'action';
  } else if (lowerText.includes('idea') || lowerText.includes('what if') ||
             lowerText.includes('could we')) {
    type = 'idea';
  } else if (lowerText.includes('?') || lowerText.includes('question') ||
             lowerText.includes('wondering')) {
    type = 'question';
  }

  // Extract potential tags
  const tags: string[] = [];
  const tagPatterns = [
    /\b(frontend|backend|api|database|ui|ux|testing|deployment|security|performance)\b/gi
  ];
  for (const pattern of tagPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      tags.push(...matches.map(m => m.toLowerCase()));
    }
  }

  return {
    team: suggestedTeam,
    project: suggestedProject,
    type,
    tags: [...new Set(tags)]
  };
}
