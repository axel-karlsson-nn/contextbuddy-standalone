// ContextBuddy Archive Page

let archived = { notes: [], tickets: [], milestones: [] };
let teams = {};
let projects = {};
let eventSource = null;

async function loadData() {
  try {
    const [archivedRes, contextsRes] = await Promise.all([
      fetch('/api/archived'),
      fetch('/api/contexts')
    ]);

    archived = await archivedRes.json();
    const contexts = await contextsRes.json();
    teams = contexts.teams || {};
    projects = contexts.projects || {};

    populateFilters();
    updateStats();
    renderArchive();
    setupSSE();
  } catch (error) {
    document.getElementById('archiveList').innerHTML = `
      <div class="text-center py-8">
        <p class="text-red-500">Failed to load archive</p>
        <p class="text-gray-500 text-sm mt-2">${error.message}</p>
      </div>
    `;
  }
}

function setupSSE() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource('/api/events');

  eventSource.addEventListener('refresh', async () => {
    // Reload data on file changes
    try {
      const archivedRes = await fetch('/api/archived');
      archived = await archivedRes.json();
      updateStats();
      renderArchive();
    } catch (e) {
      console.error('Failed to refresh:', e);
    }
  });

  eventSource.addEventListener('update', async () => {
    // Reload on specific updates
    try {
      const archivedRes = await fetch('/api/archived');
      archived = await archivedRes.json();
      updateStats();
      renderArchive();
    } catch (e) {
      console.error('Failed to refresh:', e);
    }
  });

  eventSource.onerror = () => {
    console.log('SSE connection lost, will reconnect...');
  };
}

function populateFilters() {
  const teamSelect = document.getElementById('filterTeam');
  teamSelect.innerHTML = '<option value="">All Teams</option>';

  for (const [id, team] of Object.entries(teams)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = team.name;
    teamSelect.appendChild(option);
  }
}

function updateStats() {
  document.getElementById('statNotes').textContent = archived.notes.length;
  document.getElementById('statTickets').textContent = archived.tickets.length;
  document.getElementById('statMilestones').textContent = archived.milestones.length;
}

function getFilteredItems() {
  const search = document.getElementById('search').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  const team = document.getElementById('filterTeam').value;

  const items = [];

  // Add notes
  if (!type || type === 'notes') {
    for (const note of archived.notes) {
      if (search && !note.content.toLowerCase().includes(search)) continue;
      if (team && note.team !== team) continue;
      items.push({ type: 'note', data: note, date: new Date(note.createdAt) });
    }
  }

  // Add tickets
  if (!type || type === 'tickets') {
    for (const ticket of archived.tickets) {
      if (search && !ticket.deliverable.toLowerCase().includes(search) &&
          !ticket.initiative.toLowerCase().includes(search)) continue;
      if (team && ticket.teamId !== team) continue;
      items.push({ type: 'ticket', data: ticket, date: new Date(ticket.archivedAt || ticket.createdAt) });
    }
  }

  // Add milestones
  if (!type || type === 'milestones') {
    for (const milestone of archived.milestones) {
      if (search && !milestone.name.toLowerCase().includes(search)) continue;
      items.push({ type: 'milestone', data: milestone, date: new Date(milestone.createdAt) });
    }
  }

  // Sort by date, newest first
  return items.sort((a, b) => b.date - a.date);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getTeamName(id) {
  return teams[id]?.name || id;
}

function getProjectName(id) {
  return projects[id]?.name || id;
}

function getTypeBadge(type) {
  const colors = {
    decision: 'bg-blue-100 text-blue-700',
    action: 'bg-amber-100 text-amber-700',
    note: 'bg-gray-100 text-gray-700',
    idea: 'bg-purple-100 text-purple-700',
    question: 'bg-pink-100 text-pink-700'
  };
  return `<span class="px-2 py-1 rounded text-xs font-medium ${colors[type] || colors.note}">${type}</span>`;
}

function renderArchive() {
  const items = getFilteredItems();
  const container = document.getElementById('archiveList');

  if (items.length === 0) {
    container.innerHTML = `
      <p class="text-gray-500 text-center py-8">No archived items found</p>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    if (item.type === 'note') {
      const note = item.data;
      return `
        <div class="bg-white rounded-lg shadow p-4 border-l-4 note-${note.type}">
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
              ${getTypeBadge(note.type)}
              ${note.team ? `<span class="text-xs text-gray-500">${escapeHtml(getTeamName(note.team))}</span>` : ''}
              ${note.project ? `<span class="text-xs text-gray-400">/ ${escapeHtml(getProjectName(note.project))}</span>` : ''}
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 text-xs rounded ${note.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${note.status}</span>
              <span class="text-xs text-gray-400">${formatDate(note.createdAt)}</span>
            </div>
          </div>
          <p class="text-gray-900">${escapeHtml(note.content)}</p>
        </div>
      `;
    }

    if (item.type === 'ticket') {
      const ticket = item.data;
      return `
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-gray-300">
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">ticket</span>
              <span class="text-xs text-gray-500">${escapeHtml(ticket.initiative)}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 text-xs rounded ${ticket.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${ticket.status}</span>
              <button onclick="restoreTicket('${ticket.id}')" class="text-xs text-blue-600 hover:underline">Restore</button>
              <span class="text-xs text-gray-400">${formatDate(ticket.archivedAt || ticket.createdAt)}</span>
            </div>
          </div>
          <p class="text-gray-900 font-medium">${escapeHtml(ticket.deliverable)}</p>
          <p class="text-sm text-gray-600 mt-1">Team: ${escapeHtml(getTeamName(ticket.teamId))}</p>
        </div>
      `;
    }

    if (item.type === 'milestone') {
      const milestone = item.data;
      return `
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-red-400">
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">milestone</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">${milestone.status}</span>
              <span class="text-xs text-gray-400">Target: ${formatDate(milestone.targetDate)}</span>
            </div>
          </div>
          <p class="text-gray-900 font-medium">${escapeHtml(milestone.name)}</p>
        </div>
      `;
    }

    return '';
  }).join('');
}

async function restoreTicket(ticketId) {
  if (!confirm('Restore this ticket to active status?')) return;

  try {
    const response = await fetch(`/api/tickets/${ticketId}/restore`, {
      method: 'PUT'
    });

    if (!response.ok) throw new Error('Failed to restore');

    // Remove from local archived list
    archived.tickets = archived.tickets.filter(t => t.id !== ticketId);
    updateStats();
    renderArchive();
  } catch (error) {
    alert('Failed to restore ticket: ' + error.message);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
document.getElementById('search').addEventListener('input', renderArchive);
document.getElementById('filterType').addEventListener('change', renderArchive);
document.getElementById('filterTeam').addEventListener('change', renderArchive);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (eventSource) {
    eventSource.close();
  }
});

loadData();
