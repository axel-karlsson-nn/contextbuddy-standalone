// ContextBuddy Web UI

let allNotes = [];
let contexts = { teams: {}, projects: {} };
let eventSource = null;

// Fetch data from API
async function loadData() {
  try {
    const [notesRes, contextsRes] = await Promise.all([
      fetch('/api/notes'),
      fetch('/api/contexts')
    ]);

    allNotes = await notesRes.json();
    contexts = await contextsRes.json();

    populateFilters();
    updateStats();
    renderNotes();
    setupSSE();
  } catch (error) {
    document.getElementById('notesList').innerHTML = `
      <div class="text-center py-8">
        <p class="text-red-500">Failed to load notes</p>
        <p class="text-gray-500 text-sm mt-2">${error.message}</p>
      </div>
    `;
  }
}

// Populate filter dropdowns
function populateFilters() {
  const teamSelect = document.getElementById('filterTeam');
  const projectSelect = document.getElementById('filterProject');

  // Clear existing options (except first)
  teamSelect.innerHTML = '<option value="">All Teams</option>';
  projectSelect.innerHTML = '<option value="">All Projects</option>';

  // Add teams
  for (const [id, team] of Object.entries(contexts.teams || {})) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = team.name;
    teamSelect.appendChild(option);
  }

  // Add projects
  for (const [id, project] of Object.entries(contexts.projects || {})) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = project.name;
    projectSelect.appendChild(option);
  }
}

// Update stats
function updateStats() {
  const stats = { decision: 0, action: 0, note: 0, idea: 0, question: 0 };

  for (const note of allNotes) {
    if (stats.hasOwnProperty(note.type)) {
      stats[note.type]++;
    }
  }

  document.getElementById('statDecisions').textContent = stats.decision;
  document.getElementById('statActions').textContent = stats.action;
  document.getElementById('statNotes').textContent = stats.note;
  document.getElementById('statIdeas').textContent = stats.idea;
  document.getElementById('statQuestions').textContent = stats.question;
}

// Get filtered notes
function getFilteredNotes() {
  const search = document.getElementById('search').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  const team = document.getElementById('filterTeam').value;
  const project = document.getElementById('filterProject').value;

  return allNotes.filter(note => {
    if (search && !note.content.toLowerCase().includes(search)) {
      return false;
    }
    if (type && note.type !== type) {
      return false;
    }
    if (team && note.team !== team) {
      return false;
    }
    if (project && note.project !== project) {
      return false;
    }
    return true;
  });
}

// Format date
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get type badge
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

// Render notes
function renderNotes() {
  const notes = getFilteredNotes();
  const container = document.getElementById('notesList');

  if (notes.length === 0) {
    container.innerHTML = `
      <p class="text-gray-500 text-center py-8">No notes found</p>
    `;
    return;
  }

  container.innerHTML = notes.map(note => `
    <div class="bg-white rounded-lg shadow p-4 border-l-4 note-${note.type} cursor-pointer hover:shadow-md hover:bg-gray-50 transition-all duration-150" onclick="editNote('${note.id}')">
      <div class="flex justify-between items-start mb-2">
        <div class="flex items-center gap-2">
          ${getTypeBadge(note.type)}
          ${note.team ? `<span class="text-xs text-gray-500">${contexts.teams[note.team]?.name || note.team}</span>` : ''}
          ${note.project ? `<span class="text-xs text-gray-400">/ ${contexts.projects[note.project]?.name || note.project}</span>` : ''}
        </div>
        <span class="text-xs text-gray-400">${formatDate(note.createdAt)}</span>
      </div>
      <p class="text-gray-900">${escapeHtml(note.content)}</p>
      ${note.tags && note.tags.length > 0 ? `
        <div class="mt-2 flex gap-1 flex-wrap">
          ${note.tags.map(tag => `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
      ${note.type === 'action' ? `
        <div class="mt-3 flex items-center justify-between text-sm">
          <div class="flex items-center gap-4">
            ${note.assignee ? `<span class="text-gray-600">Assignee: ${escapeHtml(note.assignee)}</span>` : ''}
            ${note.due ? `<span class="text-gray-600">Due: ${new Date(note.due).toLocaleDateString()}</span>` : ''}
            <span class="text-gray-500">${note.status === 'done' ? '✓ Done' : 'Open'}</span>
          </div>
          ${note.status === 'open' || !note.status ? `
            <button onclick="event.stopPropagation(); markNoteDone('${note.id}')" 
                    class="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors">
              Mark Done
            </button>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Mark note as done
async function markNoteDone(noteId) {
  try {
    const response = await fetch(`/api/notes/${noteId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' })
    });

    if (!response.ok) throw new Error('Failed to update');

    const updated = await response.json();
    const index = allNotes.findIndex(n => n.id === noteId);
    if (index !== -1) allNotes[index] = updated;

    renderNotes();
  } catch (error) {
    alert('Failed to mark as done: ' + error.message);
  }
}

// Edit note - open modal
function editNote(noteId) {
  const note = allNotes.find(n => n.id === noteId);
  if (!note) return;

  // Populate modal fields
  document.getElementById('editNoteId').value = noteId;
  document.getElementById('editContent').value = note.content;
  document.getElementById('editType').value = note.type;
  document.getElementById('editTags').value = (note.tags || []).join(', ');

  // Populate team dropdown
  const teamSelect = document.getElementById('editTeam');
  teamSelect.innerHTML = '<option value="">None</option>';
  for (const [id, team] of Object.entries(contexts.teams || {})) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = team.name;
    if (id === note.team) option.selected = true;
    teamSelect.appendChild(option);
  }

  // Populate project dropdown
  const projectSelect = document.getElementById('editProject');
  projectSelect.innerHTML = '<option value="">None</option>';
  for (const [id, project] of Object.entries(contexts.projects || {})) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = project.name;
    if (id === note.project) option.selected = true;
    projectSelect.appendChild(option);
  }

  // Show modal
  const modal = document.getElementById('editModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.getElementById('editContent').focus();
}

// Close edit modal
function closeEditModal() {
  const modal = document.getElementById('editModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// Save note from modal
async function saveNote(event) {
  event.preventDefault();

  const noteId = document.getElementById('editNoteId').value;
  const tagsInput = document.getElementById('editTags').value;
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

  const updates = {
    content: document.getElementById('editContent').value,
    type: document.getElementById('editType').value,
    team: document.getElementById('editTeam').value || null,
    project: document.getElementById('editProject').value || null,
    tags: tags
  };

  try {
    const response = await fetch(`/api/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Failed to save');

    const updated = await response.json();
    const index = allNotes.findIndex(n => n.id === noteId);
    if (index !== -1) allNotes[index] = updated;

    closeEditModal();
    updateStats();
    renderNotes();
  } catch (error) {
    alert('Failed to save: ' + error.message);
  }
}

// Event listeners
document.getElementById('search').addEventListener('input', renderNotes);
document.getElementById('filterType').addEventListener('change', renderNotes);
document.getElementById('filterTeam').addEventListener('change', renderNotes);
document.getElementById('filterProject').addEventListener('change', renderNotes);
document.getElementById('editForm').addEventListener('submit', saveNote);

// Close modal on backdrop click
document.getElementById('editModal').addEventListener('click', (e) => {
  if (e.target.id === 'editModal') closeEditModal();
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeEditModal();
});

// SSE for hot reload
function setupSSE() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource('/api/events');

  eventSource.addEventListener('refresh', async () => {
    try {
      const notesRes = await fetch('/api/notes');
      allNotes = await notesRes.json();
      updateStats();
      renderNotes();
    } catch (e) {
      console.error('Failed to refresh:', e);
    }
  });

  eventSource.addEventListener('update', async () => {
    try {
      const notesRes = await fetch('/api/notes');
      allNotes = await notesRes.json();
      updateStats();
      renderNotes();
    } catch (e) {
      console.error('Failed to refresh:', e);
    }
  });

  eventSource.onerror = () => {
    console.log('SSE connection lost, will reconnect...');
  };
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (eventSource) {
    eventSource.close();
  }
});

// Load data on page load
loadData();
