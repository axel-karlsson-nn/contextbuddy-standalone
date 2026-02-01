// ContextBuddy Teams Page

let teams = {};
let projects = {};
let tickets = [];

async function loadData() {
  try {
    const [contextsRes, ticketsRes] = await Promise.all([
      fetch('/api/contexts'),
      fetch('/api/tickets')
    ]);

    const contexts = await contextsRes.json();
    teams = contexts.teams || {};
    projects = contexts.projects || {};
    tickets = await ticketsRes.json();

    renderTeams();
  } catch (error) {
    document.getElementById('teamsGrid').innerHTML = `
      <div class="text-center py-8 col-span-3">
        <p class="text-red-500">Failed to load teams</p>
        <p class="text-gray-500 text-sm mt-2">${error.message}</p>
      </div>
    `;
  }
}

function getTeamProjects(teamId) {
  return Object.entries(projects)
    .filter(([_, p]) => p.team === teamId)
    .map(([id, p]) => ({ id, ...p }));
}

function getTeamTickets(teamId) {
  return tickets.filter(t => t.teamId === teamId && t.status === 'active');
}

function renderTeams() {
  const myTeamsContainer = document.getElementById('myTeamsGrid');
  const otherTeamsContainer = document.getElementById('otherTeamsGrid');
  const otherTeamsSection = document.getElementById('otherTeamsSection');
  
  const teamEntries = Object.entries(teams);
  const myTeams = teamEntries.filter(([_, t]) => t.isMyTeam);
  const otherTeams = teamEntries.filter(([_, t]) => !t.isMyTeam);

  if (myTeams.length === 0) {
    myTeamsContainer.innerHTML = `
      <div class="text-center py-8 col-span-3">
        <p class="text-gray-500">No teams yet</p>
        <p class="text-gray-400 text-sm mt-2">Create teams using Claude Code</p>
      </div>
    `;
  } else {
    myTeamsContainer.innerHTML = myTeams.map(([id, team]) => renderTeamCard(id, team)).join('');
  }

  if (otherTeams.length > 0) {
    otherTeamsSection.classList.remove('hidden');
    otherTeamsContainer.innerHTML = otherTeams.map(([id, team]) => renderTeamCard(id, team)).join('');
  } else {
    otherTeamsSection.classList.add('hidden');
  }
}

function renderTeamCard(id, team) {
  const teamProjects = getTeamProjects(id);
  const teamTickets = getTeamTickets(id);
  const responsibilities = team.responsibilities || [];

  return `
    <a href="/team.html?id=${id}" class="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
      <div class="flex justify-between items-start mb-3">
        <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(team.name)}</h3>
        <span class="text-xs text-gray-400">${id}</span>
      </div>

      <div class="space-y-3">
        <div class="flex items-center gap-2 text-sm">
          <span class="w-20 text-gray-500">Projects:</span>
          <span class="text-gray-900 font-medium">${teamProjects.length}</span>
        </div>

        <div class="flex items-center gap-2 text-sm">
          <span class="w-20 text-gray-500">Tickets:</span>
          <span class="text-gray-900 font-medium">${teamTickets.length} active</span>
        </div>

        ${responsibilities.length > 0 ? `
          <div class="text-sm">
            <span class="text-gray-500">Responsibilities:</span>
            <div class="mt-1 flex flex-wrap gap-1">
              ${responsibilities.slice(0, 3).map(r => `
                <span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">${escapeHtml(r)}</span>
              `).join('')}
              ${responsibilities.length > 3 ? `
                <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">+${responsibilities.length - 3} more</span>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    </a>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

loadData();
