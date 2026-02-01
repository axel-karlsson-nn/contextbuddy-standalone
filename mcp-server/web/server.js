#!/usr/bin/env node

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Support custom data path via environment variable
const DATA_DIR = process.env.CONTEXTBUDDY_DATA_PATH
  ? path.join(process.env.CONTEXTBUDDY_DATA_PATH, '.data')
  : path.join(__dirname, '..', '.data');
const PLANNING_DIR = path.join(DATA_DIR, 'planning');

const PORT = process.env.PORT || 3333;

// SSE clients for hot reload
const sseClients = new Set();

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json'
};

// Ensure planning directory exists
function ensurePlanningDir() {
  if (!fs.existsSync(PLANNING_DIR)) {
    fs.mkdirSync(PLANNING_DIR, { recursive: true });
  }
}

// Read all notes from monthly files
function getAllNotes() {
  const notesDir = path.join(DATA_DIR, 'notes');
  if (!fs.existsSync(notesDir)) {
    return [];
  }

  const files = fs.readdirSync(notesDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();

  const allNotes = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(notesDir, file), 'utf-8');
      const notes = JSON.parse(content);
      allNotes.push(...notes);
    } catch (e) {
      console.error(`Error reading ${file}:`, e.message);
    }
  }

  return allNotes.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Read contexts (teams and projects)
function getContexts() {
  const contextsDir = path.join(DATA_DIR, 'contexts');

  let teams = {};
  let projects = {};

  try {
    const teamsPath = path.join(contextsDir, 'teams.json');
    if (fs.existsSync(teamsPath)) {
      teams = JSON.parse(fs.readFileSync(teamsPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading teams:', e.message);
  }

  try {
    const projectsPath = path.join(contextsDir, 'projects.json');
    if (fs.existsSync(projectsPath)) {
      projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading projects:', e.message);
  }

  return { teams, projects };
}

// Get a single team
function getTeamById(id) {
  const { teams } = getContexts();
  return teams[id] || null;
}

// Update a team
function updateTeam(id, updates) {
  const contextsDir = path.join(DATA_DIR, 'contexts');
  const teamsPath = path.join(contextsDir, 'teams.json');

  let teams = {};
  try {
    if (fs.existsSync(teamsPath)) {
      teams = JSON.parse(fs.readFileSync(teamsPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading teams:', e.message);
    return null;
  }

  if (!teams[id]) {
    return null;
  }

  teams[id] = { ...teams[id], ...updates };
  fs.writeFileSync(teamsPath, JSON.stringify(teams, null, 2));
  return teams[id];
}

// Read planning periods
function getPeriods() {
  ensurePlanningDir();
  const periodsPath = path.join(PLANNING_DIR, 'periods.json');
  try {
    if (fs.existsSync(periodsPath)) {
      return JSON.parse(fs.readFileSync(periodsPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading periods:', e.message);
  }
  return [];
}

// Create planning period
function createPeriod(period) {
  ensurePlanningDir();
  const periodsPath = path.join(PLANNING_DIR, 'periods.json');
  const periods = getPeriods();
  const id = `period-${Date.now()}`;
  const newPeriod = { id, ...period };
  periods.push(newPeriod);
  fs.writeFileSync(periodsPath, JSON.stringify(periods, null, 2));
  return newPeriod;
}

// Read tickets
function getTickets() {
  ensurePlanningDir();
  const ticketsPath = path.join(PLANNING_DIR, 'tickets.json');
  try {
    if (fs.existsSync(ticketsPath)) {
      const tickets = JSON.parse(fs.readFileSync(ticketsPath, 'utf-8'));
      // Migrate string[] subDeliverables to object[] format
      return tickets.map(t => ({
        ...t,
        subDeliverables: (t.subDeliverables || []).map(s => 
          typeof s === 'string' ? { text: s, done: false } : s
        )
      }));
    }
  } catch (e) {
    console.error('Error reading tickets:', e.message);
  }
  return [];
}

// Create ticket
function createTicket(ticket) {
  ensurePlanningDir();
  const ticketsPath = path.join(PLANNING_DIR, 'tickets.json');
  const tickets = getTickets();
  const id = `ticket-${Date.now()}`;
  const newTicket = {
    id,
    ...ticket,
    status: ticket.status || 'active',
    subDeliverables: ticket.subDeliverables || [],
    supports: ticket.supports || [],
    dependsOn: ticket.dependsOn || [],
    createdAt: new Date().toISOString()
  };
  tickets.push(newTicket);
  fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2));
  return newTicket;
}

// Update ticket
function updateTicket(id, updates) {
  ensurePlanningDir();
  const ticketsPath = path.join(PLANNING_DIR, 'tickets.json');
  const tickets = getTickets();
  const index = tickets.findIndex(t => t.id === id);
  if (index === -1) {
    return null;
  }

  // Only archive cancelled tickets (done tickets stay on planning page)
  if (updates.status === 'cancelled' && !tickets[index].archivedAt) {
    updates.archivedAt = new Date().toISOString();
  }
  // Clear archivedAt if restoring to active
  if (updates.status === 'active') {
    updates.archivedAt = undefined;
  }

  tickets[index] = { ...tickets[index], ...updates };
  fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2));
  return tickets[index];
}

// Read milestones
function getMilestones() {
  const milestonesPath = path.join(DATA_DIR, 'milestones.json');
  try {
    if (fs.existsSync(milestonesPath)) {
      return JSON.parse(fs.readFileSync(milestonesPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading milestones:', e.message);
  }
  return [];
}

// Parse JSON body from request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Update note status
function updateNoteStatus(id, status) {
  return updateNote(id, { status });
}

// Update note content and other fields
function updateNote(id, updates) {
  const notesDir = path.join(DATA_DIR, 'notes');
  if (!fs.existsSync(notesDir)) {
    return null;
  }

  const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(notesDir, file);
    try {
      const notes = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const index = notes.findIndex(n => n.id === id);
      if (index !== -1) {
        notes[index] = { ...notes[index], ...updates };
        fs.writeFileSync(filePath, JSON.stringify(notes, null, 2));
        return notes[index];
      }
    } catch (e) {
      console.error(`Error updating note in ${file}:`, e.message);
    }
  }
  return null;
}

// Get archived items (notes with done/cancelled status, and archived tickets)
function getArchivedItems() {
  const notes = getAllNotes().filter(n =>
    n.status === 'done' || n.status === 'cancelled'
  );

  // Only cancelled tickets go to archive (done tickets stay on planning page)
  const tickets = getTickets().filter(t => t.status === 'cancelled');

  const milestones = getMilestones().filter(m => m.status === 'done');

  return { notes, tickets, milestones };
}

// Restore (unarchive) a ticket
function restoreTicket(id) {
  return updateTicket(id, { status: 'active', archivedAt: undefined });
}

// Broadcast SSE event to all clients
function broadcastSSE(eventType, data = {}) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(message);
  }
}

// Serve static files
function serveStatic(filePath, res) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// Request handler
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API routes
  if (url.pathname === '/api/notes') {
    let notes = getAllNotes();
    
    // Filter by ticketId if provided
    const ticketId = url.searchParams.get('ticketId');
    if (ticketId) {
      notes = notes.filter(n => n.ticketId === ticketId);
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(notes));
    return;
  }

  if (url.pathname === '/api/contexts') {
    const contexts = getContexts();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(contexts));
    return;
  }

  // GET/PUT /api/teams/:id
  const teamMatch = url.pathname.match(/^\/api\/teams\/([^\/]+)$/);
  if (teamMatch) {
    const teamId = teamMatch[1];

    if (req.method === 'GET') {
      const team = getTeamById(teamId);
      if (!team) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Team not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: teamId, ...team }));
      return;
    }

    if (req.method === 'PUT') {
      try {
        const body = await parseBody(req);
        const updated = updateTeam(teamId, body);
        if (!updated) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Team not found' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: teamId, ...updated }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }
  }

  // GET/POST /api/periods
  if (url.pathname === '/api/periods') {
    if (req.method === 'GET') {
      const periods = getPeriods();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(periods));
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const period = createPeriod(body);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(period));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }
  }

  // GET/POST /api/tickets
  if (url.pathname === '/api/tickets') {
    if (req.method === 'GET') {
      let tickets = getTickets();
      const periodId = url.searchParams.get('periodId');
      const teamId = url.searchParams.get('teamId');
      const status = url.searchParams.get('status');

      if (periodId) {
        tickets = tickets.filter(t => t.periodId === periodId);
      }
      if (teamId) {
        tickets = tickets.filter(t => t.teamId === teamId);
      }
      if (status) {
        tickets = tickets.filter(t => t.status === status);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tickets));
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const ticket = createTicket(body);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(ticket));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }
  }

  // PUT /api/tickets/:id
  const ticketMatch = url.pathname.match(/^\/api\/tickets\/([^\/]+)$/);
  if (ticketMatch && req.method === 'PUT') {
    const ticketId = ticketMatch[1];
    try {
      const body = await parseBody(req);
      const updated = updateTicket(ticketId, body);
      if (!updated) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ticket not found' }));
        return;
      }
      broadcastSSE('update', { type: 'ticket', id: ticketId });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(updated));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // PUT /api/tickets/:id/subdeliverables/:index - Toggle sub-deliverable done status
  const subDelMatch = url.pathname.match(/^\/api\/tickets\/([^\/]+)\/subdeliverables\/(\d+)$/);
  if (subDelMatch && req.method === 'PUT') {
    const ticketId = subDelMatch[1];
    const subIndex = parseInt(subDelMatch[2], 10);
    try {
      const body = await parseBody(req);
      const tickets = getTickets();
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket || !ticket.subDeliverables[subIndex]) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
      ticket.subDeliverables[subIndex].done = body.done;
      // Save directly to file
      const ticketsPath = path.join(PLANNING_DIR, 'tickets.json');
      fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2));
      broadcastSSE('update', { type: 'ticket', id: ticketId });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ticket));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // GET /api/milestones
  if (url.pathname === '/api/milestones') {
    const milestones = getMilestones();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(milestones));
    return;
  }

  // PUT /api/notes/:id - Update note content
  const noteMatch = url.pathname.match(/^\/api\/notes\/([^\/]+)$/);
  if (noteMatch && req.method === 'PUT') {
    const noteId = noteMatch[1];
    try {
      const body = await parseBody(req);
      const updated = updateNote(noteId, body);
      if (!updated) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Note not found' }));
        return;
      }
      broadcastSSE('update', { type: 'note', id: noteId });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(updated));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // PUT /api/notes/:id/status
  const noteStatusMatch = url.pathname.match(/^\/api\/notes\/([^\/]+)\/status$/);
  if (noteStatusMatch && req.method === 'PUT') {
    const noteId = noteStatusMatch[1];
    try {
      const body = await parseBody(req);
      const updated = updateNoteStatus(noteId, body.status);
      if (!updated) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Note not found' }));
        return;
      }
      broadcastSSE('update', { type: 'note', id: noteId });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(updated));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // GET /api/archived - Get all archived items
  if (url.pathname === '/api/archived') {
    const archived = getArchivedItems();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(archived));
    return;
  }

  // PUT /api/tickets/:id/restore - Restore an archived ticket
  const restoreMatch = url.pathname.match(/^\/api\/tickets\/([^\/]+)\/restore$/);
  if (restoreMatch && req.method === 'PUT') {
    const ticketId = restoreMatch[1];
    const restored = restoreTicket(ticketId);
    if (!restored) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Ticket not found' }));
      return;
    }
    broadcastSSE('update', { type: 'ticket', id: ticketId });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(restored));
    return;
  }

  // GET /api/events - SSE endpoint for hot reload
  if (url.pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Send initial connection message
    res.write('event: connected\ndata: {}\n\n');

    // Add to clients set
    sseClients.add(res);

    // Remove on close
    req.on('close', () => {
      sseClients.delete(res);
    });

    // Keep alive ping every 30 seconds
    const keepAlive = setInterval(() => {
      res.write(':ping\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
    });

    return;
  }

  // Static files
  let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  serveStatic(filePath, res);
}

// Start server
const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error('Request error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  });
});

server.listen(PORT, () => {
  console.log(`ContextBuddy Web UI running at http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);

  // Set up file watcher for hot reload
  if (fs.existsSync(DATA_DIR)) {
    let debounceTimer = null;

    fs.watch(DATA_DIR, { recursive: true }, (eventType, filename) => {
      // Debounce to avoid multiple rapid updates
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log(`File change detected: ${filename}`);
        broadcastSSE('refresh', { file: filename });
      }, 100);
    });

    console.log('File watcher enabled for hot reload');
  }
});
