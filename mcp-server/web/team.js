// ContextBuddy Team Detail Page

let teamId = null;
let team = null;
let projects = {};
let tickets = [];
let allTeams = {};
let editingResponsibilities = [];

async function loadData() {
  const params = new URLSearchParams(window.location.search);
  teamId = params.get('id');

  if (!teamId) {
    document.getElementById('content').innerHTML = `
      <div class="text-center py-8">
        <p class="text-red-500">No team ID provided</p>
        <a href="/teams.html" class="text-blue-600 hover:underline">Back to teams</a>
      </div>
    `;
    return;
  }

  try {
    const [teamRes, contextsRes, ticketsRes] = await Promise.all([
      fetch(`/api/teams/${teamId}`),
      fetch('/api/contexts'),
      fetch(`/api/tickets?teamId=${teamId}`)
    ]);

    if (!teamRes.ok) {
      throw new Error('Team not found');
    }

    team = await teamRes.json();
    const contexts = await contextsRes.json();
    projects = contexts.projects || {};
    allTeams = contexts.teams || {};
    tickets = await ticketsRes.json();

    render();
  } catch (error) {
    document.getElementById('content').innerHTML = `
      <div class="text-center py-8">
        <p class="text-red-500">${error.message}</p>
        <a href="/teams.html" class="text-blue-600 hover:underline">Back to teams</a>
      </div>
    `;
  }
}

function getTeamProjects() {
  return Object.entries(projects)
    .filter(([_, p]) => p.team === teamId)
    .map(([id, p]) => ({ id, ...p }));
}

function getTeamName(id) {
  return allTeams[id]?.name || id;
}

function render() {
  const teamProjects = getTeamProjects();
  const responsibilities = team.responsibilities || [];
  const activeTickets = tickets.filter(t => t.status === 'active');

  // Find teams that depend on this team
  const supportedByUs = tickets.filter(t =>
    t.teamId !== teamId && t.dependsOn && t.dependsOn.includes(teamId)
  );

  // Find teams this team depends on
  const dependingOn = [...new Set(activeTickets.flatMap(t => t.dependsOn || []))];

  document.getElementById('content').innerHTML = `
    <div class="mb-6">
      <a href="/teams.html" class="text-blue-600 hover:underline text-sm">&larr; Back to teams</a>
    </div>

    <header class="mb-8">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">${escapeHtml(team.name)}</h1>
          <p class="text-gray-500">${teamId}</p>
          ${team.description ? `<p class="text-gray-600 mt-2">${escapeHtml(team.description)}</p>` : ''}
        </div>
      </div>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Responsibilities -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">Responsibilities</h2>
          <button onclick="openModal()" class="text-sm text-blue-600 hover:underline">Edit</button>
        </div>
        ${responsibilities.length > 0 ? `
          <ul class="space-y-2">
            ${responsibilities.map(r => `
              <li class="flex items-start gap-2">
                <span class="text-blue-500 mt-1">&#8226;</span>
                <span class="text-gray-700">${escapeHtml(r)}</span>
              </li>
            `).join('')}
          </ul>
        ` : `
          <p class="text-gray-500 text-sm">No responsibilities defined</p>
        `}
      </div>

      <!-- Projects -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Projects</h2>
        ${teamProjects.length > 0 ? `
          <ul class="space-y-3">
            ${teamProjects.map(p => `
              <li class="p-3 bg-gray-50 rounded">
                <div class="font-medium text-gray-900">${escapeHtml(p.name)}</div>
                ${p.description ? `<div class="text-sm text-gray-600">${escapeHtml(p.description)}</div>` : ''}
              </li>
            `).join('')}
          </ul>
        ` : `
          <p class="text-gray-500 text-sm">No projects assigned</p>
        `}
      </div>

      <!-- Dependencies -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Dependencies</h2>

        <div class="space-y-4">
          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-2">Depends On</h3>
            ${dependingOn.length > 0 ? `
              <div class="flex flex-wrap gap-2">
                ${dependingOn.map(id => `
                  <a href="/team.html?id=${id}" class="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm hover:bg-amber-100">
                    ${escapeHtml(getTeamName(id))}
                  </a>
                `).join('')}
              </div>
            ` : `
              <p class="text-gray-500 text-sm">None</p>
            `}
          </div>

          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-2">Supports</h3>
            ${supportedByUs.length > 0 ? `
              <div class="flex flex-wrap gap-2">
                ${[...new Set(supportedByUs.map(t => t.teamId))].map(id => `
                  <a href="/team.html?id=${id}" class="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm hover:bg-green-100">
                    ${escapeHtml(getTeamName(id))}
                  </a>
                `).join('')}
              </div>
            ` : `
              <p class="text-gray-500 text-sm">None</p>
            `}
          </div>
        </div>
      </div>
    </div>

    <!-- Active Tickets -->
    <div class="mt-8">
      <h2 class="text-xl font-semibold mb-4">Active Tickets</h2>
      ${activeTickets.length > 0 ? `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${activeTickets.map(ticket => `
            <div class="bg-white rounded-lg shadow p-4">
              <div class="flex justify-between items-start mb-2">
                <span class="text-sm text-gray-500">${escapeHtml(ticket.initiative)}</span>
                <span class="px-2 py-0.5 text-xs rounded ${
                  ticket.status === 'active' ? 'bg-green-100 text-green-700' :
                  ticket.status === 'done' ? 'bg-gray-100 text-gray-600' :
                  'bg-red-100 text-red-700'
                }">${ticket.status}</span>
              </div>
              <h3 class="font-medium text-gray-900 mb-2">${escapeHtml(ticket.deliverable)}</h3>
              ${ticket.subDeliverables && ticket.subDeliverables.length > 0 ? `
                <ul class="text-sm text-gray-600 space-y-1">
                  ${ticket.subDeliverables.map(s => `<li class="flex items-center gap-2"><span class="text-gray-400">&#8226;</span> ${escapeHtml(s)}</li>`).join('')}
                </ul>
              ` : ''}
              ${(ticket.dependsOn && ticket.dependsOn.length > 0) || (ticket.supports && ticket.supports.length > 0) ? `
                <div class="mt-3 pt-3 border-t flex flex-wrap gap-2">
                  ${(ticket.dependsOn || []).map(id => `
                    <span class="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded">depends: ${escapeHtml(getTeamName(id))}</span>
                  `).join('')}
                  ${(ticket.supports || []).map(id => `
                    <span class="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded">supports: ${escapeHtml(getTeamName(id))}</span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      ` : `
        <p class="text-gray-500">No active tickets</p>
      `}
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Modal functions
function openModal() {
  editingResponsibilities = [...(team.responsibilities || [])];
  renderResponsibilitiesList();
  document.getElementById('responsibilitiesModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('responsibilitiesModal').classList.add('hidden');
  document.getElementById('newResponsibility').value = '';
}

function renderResponsibilitiesList() {
  const container = document.getElementById('responsibilitiesList');
  if (editingResponsibilities.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm">No responsibilities yet</p>';
    return;
  }

  container.innerHTML = editingResponsibilities.map((r, i) => `
    <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
      <span class="flex-1">${escapeHtml(r)}</span>
      <button onclick="removeResponsibility(${i})" class="text-red-600 hover:text-red-800 text-sm">Remove</button>
    </div>
  `).join('');
}

function addResponsibility() {
  const input = document.getElementById('newResponsibility');
  const value = input.value.trim();
  if (value) {
    editingResponsibilities.push(value);
    renderResponsibilitiesList();
    input.value = '';
  }
}

function removeResponsibility(index) {
  editingResponsibilities.splice(index, 1);
  renderResponsibilitiesList();
}

async function saveResponsibilities() {
  try {
    const response = await fetch(`/api/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responsibilities: editingResponsibilities })
    });

    if (!response.ok) {
      throw new Error('Failed to save');
    }

    team = await response.json();
    closeModal();
    render();
  } catch (error) {
    alert('Failed to save responsibilities: ' + error.message);
  }
}

// Handle Enter key in input
document.getElementById('newResponsibility').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addResponsibility();
  }
});

loadData();
