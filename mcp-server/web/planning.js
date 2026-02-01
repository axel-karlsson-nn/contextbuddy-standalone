// ContextBuddy Planning Page

let periods = [];
let tickets = [];
let teams = {};
let notes = [];
let selectedPeriodId = null;
let editingSubDeliverables = [];
let eventSource = null;

async function loadData() {
  try {
    const [periodsRes, ticketsRes, contextsRes, notesRes] = await Promise.all([
      fetch('/api/periods'),
      fetch('/api/tickets'),
      fetch('/api/contexts'),
      fetch('/api/notes')
    ]);

    periods = await periodsRes.json();
    tickets = await ticketsRes.json();
    const contexts = await contextsRes.json();
    teams = contexts.teams || {};
    notes = await notesRes.json();

    // Select first period by default
    if (periods.length > 0 && !selectedPeriodId) {
      selectedPeriodId = periods[0].id;
    }

    renderPeriodTabs();
    renderTickets();
    populateFormSelects();
    setupSSE();
  } catch (error) {
    document.getElementById('periodTabs').innerHTML = `
      <p class="text-red-500">Failed to load data: ${error.message}</p>
    `;
  }
}

function setupSSE() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource('/api/events');

  eventSource.addEventListener('refresh', async () => {
    try {
      const ticketsRes = await fetch('/api/tickets');
      tickets = await ticketsRes.json();
      renderTickets();
    } catch (e) {
      console.error('Failed to refresh:', e);
    }
  });

  eventSource.addEventListener('update', async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'ticket') {
        const ticketsRes = await fetch('/api/tickets');
        tickets = await ticketsRes.json();
        renderTickets();
      }
    } catch (e) {
      console.error('Failed to refresh:', e);
    }
  });

  eventSource.onerror = () => {
    console.log('SSE connection lost, will reconnect...');
  };
}

window.addEventListener('beforeunload', () => {
  if (eventSource) {
    eventSource.close();
  }
});

function renderPeriodTabs() {
  const container = document.getElementById('periodTabs');

  if (periods.length === 0) {
    container.innerHTML = `
      <p class="text-gray-500">No planning periods yet. Create one to get started.</p>
    `;
    return;
  }

  container.innerHTML = periods.map(period => `
    <button onclick="selectPeriod('${period.id}')"
            class="px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedPeriodId === period.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border'
            }">
      ${escapeHtml(period.name)}
    </button>
  `).join('');
}

function selectPeriod(periodId) {
  selectedPeriodId = periodId;
  renderPeriodTabs();
  renderTickets();
}

function renderTickets() {
  const container = document.getElementById('ticketsGrid');

  const periodTickets = tickets.filter(t => t.periodId === selectedPeriodId && t.status !== 'cancelled');

  if (periodTickets.length === 0) {
    container.innerHTML = `
      <p class="text-gray-500 col-span-3">No tickets in this period</p>
    `;
    return;
  }

  container.innerHTML = periodTickets.map(ticket => {
    const ticketNotes = getTicketNotes(ticket.id);
    const isDone = ticket.status === 'done';
    
    let html = `
    <div class="${isDone ? 'bg-gray-50 opacity-75' : 'bg-white'} rounded-lg shadow p-4">
      <div class="flex justify-between items-start mb-2">
        <div class="flex items-center gap-2">
          ${isDone ? '<span class="text-green-600">✓</span>' : ''}
          <span class="text-xs text-gray-500">${escapeHtml(ticket.initiative)}</span>
        </div>
        <div class="flex gap-1">
          <button onclick="editTicket('${ticket.id}')" class="text-gray-400 hover:text-gray-600 text-sm">Edit</button>
          ${isDone 
            ? `<button onclick="restoreTicket('${ticket.id}')" class="text-amber-600 hover:text-amber-800 text-sm ml-2">Reopen</button>`
            : `<button onclick="markTicketDone('${ticket.id}')" class="text-green-600 hover:text-green-800 text-sm ml-2">Done</button>`
          }
        </div>
      </div>

      <h3 class="font-medium ${isDone ? 'text-gray-500 line-through' : 'text-gray-900'} mb-2">${escapeHtml(ticket.deliverable)}</h3>

      <div class="text-sm text-gray-600 mb-2">
        Team: <a href="/team.html?id=${ticket.teamId}" class="text-blue-600 hover:underline">${escapeHtml(getTeamName(ticket.teamId))}</a>
      </div>`;

    if (ticket.subDeliverables && ticket.subDeliverables.length > 0) {
      html += `
        <div class="mt-3 space-y-1">
          ${ticket.subDeliverables.map((s, i) => `
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" class="rounded text-blue-600" 
                     ${s.done ? 'checked' : ''} 
                     onchange="toggleSubDeliverable('${ticket.id}', ${i}, this.checked)">
              <span class="${s.done ? 'text-gray-400 line-through' : 'text-gray-600'}">${escapeHtml(s.text || s)}</span>
            </label>
          `).join('')}
        </div>`;
    }

    if ((ticket.dependsOn && ticket.dependsOn.length > 0) || (ticket.supports && ticket.supports.length > 0)) {
      html += `
        <div class="mt-3 pt-3 border-t flex flex-wrap gap-1">
          ${(ticket.dependsOn || []).map(id => `
            <span class="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded">&#8594; ${escapeHtml(getTeamName(id))}</span>
          `).join('')}
          ${(ticket.supports || []).map(id => `
            <span class="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded">&#8592; ${escapeHtml(getTeamName(id))}</span>
          `).join('')}
        </div>`;
    }

    if (ticketNotes.length > 0) {
      html += `
        <div class="mt-3 pt-3 border-t">
          <div class="text-xs text-gray-500 mb-2">Linked notes:</div>
          <div class="space-y-2">
            ${ticketNotes.map(n => `
              <div class="text-sm p-2 bg-gray-50 rounded">
                <span class="px-1.5 py-0.5 rounded text-xs ${getNoteBadgeColor(n.type)}">${n.type}</span>
                <span class="ml-2 text-gray-700">${escapeHtml(n.content.substring(0, 100))}${n.content.length > 100 ? '...' : ''}</span>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    html += `</div>`;
    return html;
  }).join('');
}

function getTeamName(id) {
  return teams[id]?.name || id;
}

function getTicketNotes(ticketId) {
  return notes.filter(n => n.ticketId === ticketId);
}

function getNoteBadgeColor(type) {
  const colors = {
    decision: 'bg-blue-100 text-blue-700',
    action: 'bg-amber-100 text-amber-700',
    note: 'bg-gray-100 text-gray-700',
    idea: 'bg-purple-100 text-purple-700',
    question: 'bg-pink-100 text-pink-700'
  };
  return colors[type] || colors.note;
}

function populateFormSelects() {
  // Populate period select
  const periodSelect = document.querySelector('#ticketForm select[name="periodId"]');
  periodSelect.innerHTML = periods.map(p => `
    <option value="${p.id}" ${p.id === selectedPeriodId ? 'selected' : ''}>${escapeHtml(p.name)}</option>
  `).join('');

  // Populate team selects
  const teamOptions = Object.entries(teams).map(([id, t]) =>
    `<option value="${id}">${escapeHtml(t.name)}</option>`
  ).join('');

  document.querySelector('#ticketForm select[name="teamId"]').innerHTML =
    '<option value="">Select team...</option>' + teamOptions;
  document.querySelector('#ticketForm select[name="supports"]').innerHTML = teamOptions;
  document.querySelector('#ticketForm select[name="dependsOn"]').innerHTML = teamOptions;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Period Modal
function openPeriodModal() {
  document.getElementById('periodForm').reset();
  document.getElementById('periodModal').classList.remove('hidden');
}

function closePeriodModal() {
  document.getElementById('periodModal').classList.add('hidden');
}

document.getElementById('periodForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  try {
    const response = await fetch('/api/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        year: parseInt(formData.get('year'))
      })
    });

    if (!response.ok) throw new Error('Failed to create period');

    const newPeriod = await response.json();
    periods.push(newPeriod);
    selectedPeriodId = newPeriod.id;
    closePeriodModal();
    renderPeriodTabs();
    renderTickets();
    populateFormSelects();
  } catch (error) {
    alert('Failed to create period: ' + error.message);
  }
});

// Ticket Modal
let editingTicketId = null;

function openTicketModal(ticket = null) {
  editingTicketId = ticket?.id || null;
  editingSubDeliverables = ticket?.subDeliverables ? [...ticket.subDeliverables] : [];

  document.getElementById('ticketModalTitle').textContent = ticket ? 'Edit Ticket' : 'Create Ticket';

  const form = document.getElementById('ticketForm');
  form.reset();

  if (ticket) {
    form.elements.periodId.value = ticket.periodId;
    form.elements.teamId.value = ticket.teamId;
    form.elements.initiative.value = ticket.initiative;
    form.elements.deliverable.value = ticket.deliverable;

    // Set multi-select values
    Array.from(form.elements.supports.options).forEach(opt => {
      opt.selected = (ticket.supports || []).includes(opt.value);
    });
    Array.from(form.elements.dependsOn.options).forEach(opt => {
      opt.selected = (ticket.dependsOn || []).includes(opt.value);
    });
  } else if (selectedPeriodId) {
    form.elements.periodId.value = selectedPeriodId;
  }

  renderSubDeliverablesList();
  document.getElementById('ticketModal').classList.remove('hidden');
}

function closeTicketModal() {
  document.getElementById('ticketModal').classList.add('hidden');
  editingTicketId = null;
  editingSubDeliverables = [];
}

function renderSubDeliverablesList() {
  const container = document.getElementById('subDeliverablesList');
  container.innerHTML = editingSubDeliverables.map((s, i) => `
    <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
      <span class="flex-1 text-sm">${escapeHtml(s)}</span>
      <button type="button" onclick="removeSubDeliverable(${i})" class="text-red-600 hover:text-red-800 text-xs">Remove</button>
    </div>
  `).join('');
}

function addSubDeliverable() {
  const input = document.getElementById('newSubDeliverable');
  const value = input.value.trim();
  if (value) {
    editingSubDeliverables.push(value);
    renderSubDeliverablesList();
    input.value = '';
  }
}

function removeSubDeliverable(index) {
  editingSubDeliverables.splice(index, 1);
  renderSubDeliverablesList();
}

document.getElementById('newSubDeliverable').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addSubDeliverable();
  }
});

document.getElementById('ticketForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;

  const data = {
    periodId: form.elements.periodId.value,
    teamId: form.elements.teamId.value,
    initiative: form.elements.initiative.value,
    deliverable: form.elements.deliverable.value,
    subDeliverables: editingSubDeliverables,
    supports: Array.from(form.elements.supports.selectedOptions).map(o => o.value),
    dependsOn: Array.from(form.elements.dependsOn.selectedOptions).map(o => o.value)
  };

  try {
    const url = editingTicketId ? `/api/tickets/${editingTicketId}` : '/api/tickets';
    const method = editingTicketId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to save ticket');

    const savedTicket = await response.json();

    if (editingTicketId) {
      const index = tickets.findIndex(t => t.id === editingTicketId);
      if (index !== -1) tickets[index] = savedTicket;
    } else {
      tickets.push(savedTicket);
    }

    closeTicketModal();
    renderTickets();
  } catch (error) {
    alert('Failed to save ticket: ' + error.message);
  }
});

function editTicket(ticketId) {
  const ticket = tickets.find(t => t.id === ticketId);
  if (ticket) {
    openTicketModal(ticket);
  }
}

async function markTicketDone(ticketId) {
  if (!confirm('Mark this ticket as done?')) return;

  try {
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' })
    });

    if (!response.ok) throw new Error('Failed to update ticket');

    const updated = await response.json();
    const index = tickets.findIndex(t => t.id === ticketId);
    if (index !== -1) tickets[index] = updated;

    renderTickets();
  } catch (error) {
    alert('Failed to update ticket: ' + error.message);
  }
}

async function restoreTicket(ticketId) {
  try {
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' })
    });

    if (!response.ok) throw new Error('Failed to restore ticket');

    const updated = await response.json();
    const index = tickets.findIndex(t => t.id === ticketId);
    if (index !== -1) tickets[index] = updated;

    renderTickets();
  } catch (error) {
    alert('Failed to restore ticket: ' + error.message);
  }
}

async function toggleSubDeliverable(ticketId, index, done) {
  try {
    const response = await fetch(`/api/tickets/${ticketId}/subdeliverables/${index}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done })
    });

    if (!response.ok) throw new Error('Failed to update');

    const updated = await response.json();
    const ticketIndex = tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex !== -1) tickets[ticketIndex] = updated;
    
    // Re-render to update styling
    renderTickets();
  } catch (error) {
    alert('Failed to update: ' + error.message);
  }
}

loadData();
