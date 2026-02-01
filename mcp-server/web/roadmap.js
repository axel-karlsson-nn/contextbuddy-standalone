// ContextBuddy Roadmap Page

let periods = [];
let tickets = [];
let milestones = [];
let teams = {};
let gantt = null;

async function loadData() {
  try {
    const [periodsRes, ticketsRes, milestonesRes, contextsRes] = await Promise.all([
      fetch('/api/periods'),
      fetch('/api/tickets?status=active'),
      fetch('/api/milestones'),
      fetch('/api/contexts')
    ]);

    periods = await periodsRes.json();
    tickets = await ticketsRes.json();
    milestones = await milestonesRes.json();
    const contexts = await contextsRes.json();
    teams = contexts.teams || {};

    renderLegend();
    renderGantt();
  } catch (error) {
    document.getElementById('ganttContainer').innerHTML = `
      <p class="text-red-500 text-center py-8">Failed to load data: ${error.message}</p>
    `;
  }
}

function getMyTeamIds() {
  return Object.entries(teams)
    .filter(([_, t]) => t.isMyTeam)
    .map(([id, _]) => id);
}

function getTeamColor(teamId) {
  const teamIds = getMyTeamIds();
  const index = teamIds.indexOf(teamId);
  return index >= 0 ? index % 6 : 0;
}

function renderLegend() {
  const container = document.getElementById('legend');
  const myTeamIds = getMyTeamIds();
  const myTeams = myTeamIds.map(id => [id, teams[id]]);

  if (myTeams.length === 0) return;

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  container.innerHTML = myTeams.slice(0, 6).map(([id, team], i) => `
    <div class="flex items-center gap-1">
      <span class="w-3 h-3 rounded" style="background: ${colors[i % 6]}"></span>
      <span class="text-gray-600">${escapeHtml(team.name)}</span>
    </div>
  `).join('');
}

function renderGantt() {
  const container = document.getElementById('ganttContainer');
  const emptyState = document.getElementById('emptyState');

  // Build tasks from tickets and milestones
  const tasks = [];

  // Filter to only my teams' tickets
  const myTeamIds = getMyTeamIds();
  const myTickets = tickets.filter(t => myTeamIds.includes(t.teamId));

  // Add tickets as bars
  myTickets.forEach(ticket => {
    const period = periods.find(p => p.id === ticket.periodId);
    if (!period) return;

    const teamColorIndex = getTeamColor(ticket.teamId);

    tasks.push({
      id: ticket.id,
      name: ticket.deliverable,
      start: period.startDate,
      end: period.endDate,
      progress: 0,
      custom_class: `bar-team-${teamColorIndex}`,
      dependencies: (ticket.dependsOn || []).map(teamId => {
        // Find a ticket from that team in the same or earlier period
        const depTicket = tickets.find(t =>
          t.teamId === teamId &&
          t.id !== ticket.id
        );
        return depTicket?.id;
      }).filter(Boolean).join(', ')
    });
  });

  // Add milestones as short bars
  milestones.forEach(milestone => {
    tasks.push({
      id: milestone.id,
      name: milestone.name,
      start: milestone.targetDate,
      end: milestone.targetDate,
      progress: milestone.status === 'done' ? 100 : 0,
      custom_class: 'bar-milestone'
    });
  });

  if (tasks.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  emptyState.classList.add('hidden');

  // Clear previous gantt
  container.innerHTML = '<svg id="gantt"></svg>';

  // Initialize Frappe Gantt
  gantt = new Gantt('#gantt', tasks, {
    view_mode: document.getElementById('viewMode').value,
    date_format: 'YYYY-MM-DD',
    bar_height: 30,
    bar_corner_radius: 4,
    arrow_curve: 5,
    padding: 18,
    on_click: (task) => {
      showDetail(task.id);
    },
    on_date_change: (task, start, end) => {
      // Could update ticket dates here in future
      console.log('Date changed:', task.name, start, end);
    }
  });
}

function showDetail(id) {
  // Find the item (ticket or milestone)
  const ticket = tickets.find(t => t.id === id);
  const milestone = milestones.find(m => m.id === id);

  const content = document.getElementById('detailContent');

  if (ticket) {
    const period = periods.find(p => p.id === ticket.periodId);
    content.innerHTML = `
      <div class="mb-2 text-sm text-gray-500">${escapeHtml(ticket.initiative)}</div>
      <h3 class="text-lg font-semibold mb-3">${escapeHtml(ticket.deliverable)}</h3>

      <div class="space-y-2 text-sm">
        <div><span class="text-gray-500">Team:</span> <a href="/team.html?id=${ticket.teamId}" class="text-blue-600 hover:underline">${escapeHtml(getTeamName(ticket.teamId))}</a></div>
        <div><span class="text-gray-500">Period:</span> ${period ? escapeHtml(period.name) : 'Unknown'}</div>
        <div><span class="text-gray-500">Status:</span> ${ticket.status}</div>
      </div>

      ${ticket.subDeliverables && ticket.subDeliverables.length > 0 ? `
        <div class="mt-4">
          <div class="text-sm font-medium text-gray-700 mb-2">Sub-deliverables:</div>
          <ul class="text-sm text-gray-600 space-y-1">
            ${ticket.subDeliverables.map(s => `<li>&#8226; ${escapeHtml(s)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${(ticket.dependsOn && ticket.dependsOn.length > 0) || (ticket.supports && ticket.supports.length > 0) ? `
        <div class="mt-4 flex flex-wrap gap-2">
          ${(ticket.dependsOn || []).map(id => `
            <span class="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded">depends: ${escapeHtml(getTeamName(id))}</span>
          `).join('')}
          ${(ticket.supports || []).map(id => `
            <span class="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded">supports: ${escapeHtml(getTeamName(id))}</span>
          `).join('')}
        </div>
      ` : ''}
    `;
  } else if (milestone) {
    content.innerHTML = `
      <div class="mb-2 text-sm text-gray-500">Milestone</div>
      <h3 class="text-lg font-semibold mb-3">${escapeHtml(milestone.name)}</h3>

      <div class="space-y-2 text-sm">
        <div><span class="text-gray-500">Target Date:</span> ${new Date(milestone.targetDate).toLocaleDateString()}</div>
        <div><span class="text-gray-500">Status:</span> ${milestone.status}</div>
      </div>
    `;
  } else {
    content.innerHTML = '<p class="text-gray-500">Item not found</p>';
  }

  document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.add('hidden');
}

function getTeamName(id) {
  return teams[id]?.name || id;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// View mode change
document.getElementById('viewMode').addEventListener('change', (e) => {
  if (gantt) {
    gantt.change_view_mode(e.target.value);
  }
});

// Close modal on escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDetailModal();
  }
});

loadData();
