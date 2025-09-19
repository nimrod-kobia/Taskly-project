// CONFIG: change if your backend path differs
const API_BASE = '/Taskly-project/backend/api/tasks.php'; // adjust path relative to webserver root

// Bootstrapped objects
const taskModalEl = document.getElementById('taskModal');
const bootstrapModal = taskModalEl ? new bootstrap.Modal(taskModalEl) : null;

document.addEventListener('DOMContentLoaded', () => {
  // UI bindings
  document.getElementById('createTaskBtn').addEventListener('click', openCreate);
  document.getElementById('viewSelect').addEventListener('change', switchView);
  document.getElementById('taskForm').addEventListener('submit', submitTask);
  document.getElementById('searchInput').addEventListener('input', filterTasks);

  loadTasks();
});

let tasksCache = [];

// Load tasks from backend
async function loadTasks() {
  try {
    const res = await fetch(API_BASE + '?action=list');
    const data = await res.json();
    // Expected: { success: true, tasks: [...] }
    tasksCache = data.tasks || [];
    renderListView(tasksCache);
    renderKanban(tasksCache);
  } catch (err) {
    console.error('Failed to load tasks', err);
  }
}

// Render list view
function renderListView(tasks) {
  const container = document.getElementById('listView');
  container.innerHTML = '';
  if (!tasks.length) {
    container.innerHTML = '<div class="alert alert-info">No tasks yet</div>';
    return;
  }
  tasks.forEach(t => {
    const card = document.createElement('div');
    card.className = `col-12 task-card ${urgencyClass(t.urgency)}`;
    card.innerHTML = `
      <div class="d-flex justify-content-between">
        <div>
          <h5>${escapeHtml(t.title)} <small class="text-muted">#${t.id}</small></h5>
          <div class="text-muted">${escapeHtml(t.description || '')}</div>
          <div class="mt-2"><small>Due: ${t.deadline || '—' } • Effort: ${t.effort || '—'}h • Priority: ${t.priority_score ?? '—'}</small></div>
        </div>
        <div class="text-end">
          <div>
            <select class="form-select form-select-sm mb-2" onchange="changeStatus(${t.id}, this.value)">
              <option value="todo"${t.status==='todo'?' selected':''}>To do</option>
              <option value="in-progress"${t.status==='in-progress'?' selected':''}>In progress</option>
              <option value="done"${t.status==='done'?' selected':''}>Done</option>
            </select>
          </div>
          <button class="btn btn-sm btn-outline-primary mb-1" onclick="editTask(${t.id})"><i class="fa fa-pen"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTask(${t.id})"><i class="fa fa-trash"></i></button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Render Kanban
function renderKanban(tasks) {
  ['todo','in-progress','done'].forEach(k => {
    const col = document.getElementById('col-' + k.replace(' ',''));
    col.innerHTML = '';
    tasks.filter(t => t.status === k).forEach(t => {
      const card = document.createElement('div');
      card.className = `task-card ${urgencyClass(t.urgency)}`;
      card.innerHTML = `<strong>${escapeHtml(t.title)}</strong><div class="small text-muted">${t.deadline || ''}</div>`;
      col.appendChild(card);
    });
  });
}

function urgencyClass(u) {
  if (u === 'high') return 'urgency-high';
  if (u === 'medium') return 'urgency-medium';
  return 'urgency-low';
}

function openCreate() {
  document.getElementById('modalTitle').innerText = 'Create Task';
  document.getElementById('taskForm').reset();
  document.getElementById('taskId').value = '';
  bootstrapModal.show();
}

async function submitTask(ev) {
  ev.preventDefault();
  const id = document.getElementById('taskId').value;
  const payload = {
    title: document.getElementById('title').value.trim(),
    description: document.getElementById('description').value.trim(),
    deadline: document.getElementById('deadline').value || null,
    urgency: document.getElementById('urgency').value,
    effort: Number(document.getElementById('effort').value) || 0
  };
  try {
    const action = id ? 'update' : 'create';
    if (id) payload.id = id;
    const res = await fetch(API_BASE + '?action=' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      bootstrapModal.hide();
      loadTasks();
    } else {
      alert('Error: ' + (data.message || 'unknown'));
    }
  } catch (err) {
    console.error(err);
    alert('Request failed');
  }
}

async function editTask(id) {
  const t = tasksCache.find(x => x.id === id);
  if (!t) return;
  document.getElementById('modalTitle').innerText = 'Edit Task';
  document.getElementById('taskId').value = t.id;
  document.getElementById('title').value = t.title;
  document.getElementById('description').value = t.description || '';
  document.getElementById('deadline').value = t.deadline || '';
  document.getElementById('urgency').value = t.urgency || 'medium';
  document.getElementById('effort').value = t.effort || 1;
  bootstrapModal.show();
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    const res = await fetch(API_BASE + '?action=delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) loadTasks(); else alert('Delete failed');
  } catch (err) { console.error(err); alert('Delete request failed'); }
}

async function changeStatus(id, status) {
  try {
    const res = await fetch(API_BASE + '?action=update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    const data = await res.json();
    if (data.success) loadTasks(); else console.warn('status update failed');
  } catch (err) { console.error(err); }
}

function filterTasks(ev) {
  const q = ev.target.value.trim().toLowerCase();
  const filtered = tasksCache.filter(t => (t.title + ' ' + (t.description||'')).toLowerCase().includes(q));
  renderListView(filtered);
  renderKanban(filtered);
}

// small helpers
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
