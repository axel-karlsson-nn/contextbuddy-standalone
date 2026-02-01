import * as path from 'path';
import { PlanningPeriod, Ticket, TicketStatus } from '../types.js';
import {
  STORAGE_DIR,
  readJsonFile,
  writeJsonFile,
  ensureDir
} from './index.js';

const PLANNING_DIR = path.join(STORAGE_DIR, 'planning');
const PERIODS_PATH = path.join(PLANNING_DIR, 'periods.json');
const TICKETS_PATH = path.join(PLANNING_DIR, 'tickets.json');

function ensurePlanningDir(): void {
  ensureDir(PLANNING_DIR);
}

// Periods
export function getPeriods(): PlanningPeriod[] {
  ensurePlanningDir();
  return readJsonFile<PlanningPeriod[]>(PERIODS_PATH, []);
}

export function addPeriod(period: Omit<PlanningPeriod, 'id'>): PlanningPeriod {
  ensurePlanningDir();
  const periods = getPeriods();
  const id = `period-${Date.now()}`;
  const newPeriod: PlanningPeriod = { id, ...period };
  periods.push(newPeriod);
  writeJsonFile(PERIODS_PATH, periods);
  return newPeriod;
}

export function getPeriodById(id: string): PlanningPeriod | null {
  const periods = getPeriods();
  return periods.find(p => p.id === id) || null;
}

// Tickets
export function getTickets(): Ticket[] {
  ensurePlanningDir();
  return readJsonFile<Ticket[]>(TICKETS_PATH, []);
}

export function getTicketsByPeriod(periodId: string): Ticket[] {
  return getTickets().filter(t => t.periodId === periodId);
}

export function getTicketsByTeam(teamId: string): Ticket[] {
  return getTickets().filter(t => t.teamId === teamId);
}

export function addTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'status'>): Ticket {
  ensurePlanningDir();
  const tickets = getTickets();
  const id = `ticket-${Date.now()}`;
  const newTicket: Ticket = {
    id,
    ...ticket,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  tickets.push(newTicket);
  writeJsonFile(TICKETS_PATH, tickets);
  return newTicket;
}

export function updateTicket(id: string, updates: Partial<Omit<Ticket, 'id' | 'createdAt'>>): Ticket | null {
  const tickets = getTickets();
  const index = tickets.findIndex(t => t.id === id);
  if (index === -1) {
    return null;
  }

  // If marking as done or cancelled, set archivedAt
  if (updates.status && updates.status !== 'active' && !tickets[index].archivedAt) {
    updates.archivedAt = new Date().toISOString();
  }

  tickets[index] = { ...tickets[index], ...updates };
  writeJsonFile(TICKETS_PATH, tickets);
  return tickets[index];
}

export function getTicketById(id: string): Ticket | null {
  const tickets = getTickets();
  return tickets.find(t => t.id === id) || null;
}

export function getArchivedTickets(): Ticket[] {
  return getTickets().filter(t => t.status !== 'active');
}

export function getActiveTickets(): Ticket[] {
  return getTickets().filter(t => t.status === 'active');
}
