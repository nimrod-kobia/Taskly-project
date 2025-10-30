// Frontend/scripts/tasks.js

const token = localStorage.getItem('jwt'); // JWT stored on login

async function request(action, method = 'GET', data = null, taskId = null) {
  let url = `/Backend/controllers/tasks.php?action=${action}`;
  if (taskId) url += `&id=${taskId}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: data ? JSON.stringify(data) : null
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Server returned non-JSON:', text);
    alert('Server error, check console');
    return null;
  }
}

// Fetch tasks and render
async function fetchTasks() {
  const result = await request('get');
  if (!result || !result.tasks) return;
  const tbody = document.getElementById('taskList');
  tbody.innerHTML = '';

  result.tasks.forEach(task => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${task.title}</td>
      <td>${task.description || ''}</td>
      <td>${task.due_date ? new Date(task.due_date).toLocaleDateString() : ''}</td>
      <td>${task.priority || ''}</td>
      <td>${task.status}</td>
      <td>${task.importance || ''}</td>
      <td>
        <button class="btn btn-sm btn-success me-1" data-id="${task.id}" data-action="edit">Edit</button>
        <button class="btn btn-sm btn-danger" data-id="${task.id}" data-action="delete">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Add listeners
  tbody.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', handleTaskAction);
  });
}

// Handle Edit/Delete
async function handleTaskAction(e) {
  const btn = e.target;
  const taskId = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'delete') {
    const res = await request('delete', 'POST', null, taskId);
    if (res && res.success) fetchTasks();
    else alert(res.error || 'Error deleting task');
  } else if (action === 'edit') {
    const tasksRes = await request('get');
    const task = tasksRes.tasks.find(t => t.id == taskId);
    if (!task) return alert('Task not found');

    document.getElementById('taskId').value = task.id;
    document.getElementById('title').value = task.title;
    document.getElementById('description').value = task.description;
    document.getElementById('deadline').value = task.due_date ? task.due_date.split('T')[0] : '';
    document.getElementById('status').value = task.status;
    document.getElementById('priority').value = task.priority || 2;
    document.getElementById('importance').value = task.importance || 3;

    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
  }
}

// Handle create/update form
document.getElementById('taskForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('taskId').value;
  const data = {
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    due_date: document.getElementById('deadline').value || null,
    status: document.getElementById('status').value,
    priority: parseInt(document.getElementById('priority').value),
    importance: parseInt(document.getElementById('importance').value)
  };

  let res;
  if (id) res = await request('update', 'POST', data, id);
  else res = await request('create', 'POST', data);

  if (res && res.success) {
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
    fetchTasks();
  } else {
    alert(res.error || 'Error saving task');
  }
});

// Initial load
fetchTasks();
