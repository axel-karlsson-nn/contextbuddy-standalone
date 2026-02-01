export interface Config {
  version: string;
  defaultTeam: string | null;
  autoCapture: 'aggressive' | 'conservative' | 'off';
  createdAt: string;
}

export interface Team {
  name: string;
  description?: string;
  responsibilities?: string[];
  isMyTeam?: boolean;
  createdAt: string;
}

export interface Project {
  name: string;
  team?: string;
  description?: string;
  createdAt: string;
}

export interface Teams {
  [id: string]: Team;
}

export interface Projects {
  [id: string]: Project;
}

export type NoteType = 'decision' | 'note' | 'action' | 'idea' | 'question';
export type ActionStatus = 'open' | 'done' | 'cancelled' | null;

export interface Note {
  id: string;
  createdAt: string;
  type: NoteType;
  content: string;
  team?: string;
  project?: string;
  ticketId?: string;
  tags: string[];
  status: ActionStatus;
  assignee?: string;
  due?: string;
}

export interface SearchParams {
  query?: string;
  team?: string;
  project?: string;
  type?: NoteType;
  from?: string;
  to?: string;
}

export interface ContextSuggestion {
  team?: string;
  project?: string;
  type: NoteType;
  tags: string[];
}

// Planning types
export interface PlanningPeriod {
  id: string;
  name: string;        // "P1 2026"
  startDate: string;
  endDate: string;
  year: number;
}

export type TicketStatus = 'active' | 'done' | 'cancelled';

export interface SubDeliverable {
  text: string;
  done: boolean;
}

export interface Ticket {
  id: string;
  periodId: string;
  initiative: string;
  deliverable: string;
  subDeliverables: SubDeliverable[];
  teamId: string;
  supports: string[];      // team IDs
  dependsOn: string[];     // team IDs
  status: TicketStatus;
  archivedAt?: string;
  createdAt: string;
}

export type MilestoneStatus = 'planned' | 'done';

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  targetDate: string;
  status: MilestoneStatus;
  createdAt: string;
}
