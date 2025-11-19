document.addEventListener('DOMContentLoaded', () => {

  // === AUTH HELPERS ===
  const getToken = () => localStorage.getItem('jwt') || sessionStorage.getItem('jwt');

  const logout = () => {
    // Fully clear local & session storage
    localStorage.clear();
    sessionStorage.clear();

    // Redirect to login
    window.location.replace('login.html');
  };

  const getCurrentUser = () => {
    const token = getToken();
    if (!token) {
      // no token at all — redirect immediately
      logout();
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      // token expired?
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        logout();
        return null;
      }

      return payload;
    } catch {
      logout();
      return null;
    }
  };

  // === TASKS ARRAY ===
  let tasks = [];

  // === FETCH TASKS ===
  const fetchTasks = async () => {
    const user = getCurrentUser();
    if (!user) {
      console.log('No user found, cannot fetch tasks');
      return;
    }

    console.log('Fetching tasks for user:', user.user_id);
    
    // Get sort preference
    const sortSelect = document.getElementById('sortSelect');
    const sort = sortSelect ? sortSelect.value : 'score';

    try {
      const res = await fetch(`http://localhost:8000/tasks.php?user_id=${user.user_id}&sort=${sort}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);

      if (!res.ok) {
        console.error('Fetch tasks error:', data);
        alert('Failed to load tasks: ' + (data.message || 'Unknown error'));
        return;
      }

      tasks = Array.isArray(data.tasks) ? data.tasks : Object.values(data.tasks);
      console.log('Tasks to render:', tasks.length);
      renderTasks(tasks);
      if (window.profileRefresh) window.profileRefresh();

    } catch (err) {
      console.error('Error fetching tasks:', err);
      alert('Server error while loading tasks: ' + err.message);
    }
  };

  // === CREATE / UPDATE TASK ===
  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', async e => {
      e.preventDefault();

      const taskData = {
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        due_date: document.getElementById('deadline').value,
        priority: document.getElementById('urgency').value,
        effort: parseInt(document.getElementById('effort').value) || 1,
        status: document.getElementById('status').value
      };

      const editId = taskForm.dataset.editId;
      const user = getCurrentUser();
      if (!user) return;

      if (editId) {
        taskData.id = editId;
      } else {
        taskData.user_id = user.user_id;
      }

      try {
        const res = await fetch('http://localhost:8000/tasks.php', {
          method: editId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify(taskData)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          const modalInstance = bootstrap.Modal.getInstance(document.getElementById('taskModal'));
          if (modalInstance) modalInstance.hide();

          taskForm.reset();
          delete taskForm.dataset.editId;
          fetchTasks();
        } else {
          alert(data.message || data.error || 'Failed to save task.');
        }

      } catch (err) {
        console.error('Task save error:', err);
        alert('Server error while saving task.');
      }
    });
  }

  // === DELETE TASK ===
  const deleteTask = async id => {
    if (!confirm('Delete this task?')) return;

    try {
      const res = await fetch(`http://localhost:8000/tasks.php?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (res.ok && data.success) fetchTasks();
      else alert(data.error || 'Failed to delete task.');
    } catch (err) {
      console.error('Delete task error:', err);
      alert('Server error while deleting task.');
    }
  };

  // === RENDER TASKS ===
  const renderTasks = tasks => {
    console.log('Rendering tasks:', tasks);
    const tbody = document.getElementById('taskList');
    if (!tbody) {
      console.error('taskList element not found!');
      return;
    }
    tbody.innerHTML = '';

    if (!tasks.length) {
      console.log('No tasks to display');
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No tasks found</td></tr>`;
      return;
    }

    console.log('Rendering', tasks.length, 'tasks');
    tasks.forEach(task => {
      const tr = document.createElement('tr');
      const score = task.score || 0;
      const scoreColor = score >= 15 ? 'danger' : score >= 10 ? 'warning' : 'success';
      
      tr.innerHTML = `
        <td><span class="badge bg-${scoreColor}">${score}</span></td>
        <td>${task.title}</td>
        <td>${task.description || ''}</td>
        <td>${task.due_date || ''}</td>
        <td><span class="badge bg-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'secondary'}">${task.priority || ''}</span></td>
        <td><span class="badge bg-${task.status === 'done' ? 'success' : task.status === 'inprogress' ? 'primary' : 'secondary'}">${task.status || ''}</span></td>
        <td>
          <button class="btn btn-sm btn-primary edit-btn" data-id="${task.id}">Edit</button>
          <button class="btn btn-sm btn-info share-btn" data-id="${task.id}">
            <i class="bi bi-share"></i> Share
          </button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${task.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.edit-btn').forEach(btn =>
      btn.addEventListener('click', () => openEditModal(btn.dataset.id))
    );

    tbody.querySelectorAll('.share-btn').forEach(btn =>
      btn.addEventListener('click', () => openShareModal(btn.dataset.id))
    );

    tbody.querySelectorAll('.delete-btn').forEach(btn =>
      btn.addEventListener('click', () => deleteTask(btn.dataset.id))
    );
  };

  const openEditModal = taskId => {
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;

    document.getElementById('title').value = task.title;
    document.getElementById('description').value = task.description || '';
    document.getElementById('deadline').value = task.due_date || '';
    document.getElementById('urgency').value = task.priority || '';
    document.getElementById('status').value = task.status || '';
    document.getElementById('effort').value = task.effort || 1;

    taskForm.dataset.editId = taskId;
    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
  };

  // === SORT SELECT ===
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      fetchTasks();
    });
  }

  // === LOGOUT ===
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // === INITIAL LOAD ===
  // ✅ Only call fetchTasks if a token exists and is valid
  if (getToken()) fetchTasks();

  // Render tasks in Kanban view
const renderKanban = (tasks) => {
  const kanbanEl = document.getElementById('kanbanView');
  if (!kanbanEl) return;

  // Clear previous content
  kanbanEl.innerHTML = '';

  // Group tasks by status
  const statusGroups = {
    todo: [],
    inprogress: [],
    done: []
  };

  tasks.forEach(task => {
    const status = task.status.toLowerCase();
    if (statusGroups[status]) statusGroups[status].push(task);
    else statusGroups.todo.push(task); // fallback
  });

  // Column labels
  const columns = [
    { key: 'todo', title: 'To Do', color: 'bg-primary' },
    { key: 'inprogress', title: 'In Progress', color: 'bg-warning text-dark' },
    { key: 'done', title: 'Done', color: 'bg-success' }
  ];

  // Build columns
  const row = document.createElement('div');
  row.className = 'row';

  columns.forEach(col => {
    const colDiv = document.createElement('div');
    colDiv.className = 'col-md-4 mb-3';

    const card = document.createElement('div');
    card.className = 'card shadow-sm';

    const cardHeader = document.createElement('div');
    cardHeader.className = `card-header ${col.color} text-center`;
    cardHeader.textContent = `${col.title} (${statusGroups[col.key].length})`;

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    
    // Render tasks
    statusGroups[col.key].forEach(task => {
      const taskCard = document.createElement('div');
      taskCard.className = 'card mb-2';
      taskCard.innerHTML = `
        <div class="card-body p-2">
          <h6 class="card-title mb-1">${task.title}</h6>
          <p class="card-text mb-1 small">${task.description || ''}</p>
          <p class="card-text mb-0 small text-muted">Due: ${task.due_date || 'N/A'}</p>
        </div>
      `;
      cardBody.appendChild(taskCard);
    });

    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    colDiv.appendChild(card);
    row.appendChild(colDiv);
  });

  kanbanEl.appendChild(row);
};

// === VIEW TOGGLE ===
const viewSelect = document.getElementById('viewSelect');

viewSelect.addEventListener('change', () => {
  const listView = document.getElementById('listView');
  const kanbanView = document.getElementById('kanbanView');

  switch (viewSelect.value) {
    case 'list':
      listView.style.display = '';
      kanbanView.style.display = 'none';
      break;
    case 'kanban':
      listView.style.display = 'none';
      kanbanView.style.display = '';
      renderKanban(tasks); // render Kanban with current tasks
      break;
    default:
      listView.style.display = '';
      kanbanView.style.display = 'none';
      break;
  }
});

if (viewSelect.value === 'kanban') {
  renderKanban(tasks);
}

// === FILTER TASKS BASED ON SEARCH INPUT ===
const filterTasks = () => {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();

  const filtered = tasks.filter(task => {
    return (
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query)) ||
      (task.status && task.status.toLowerCase().includes(query)) ||
      (task.priority && task.priority.toLowerCase().includes(query))
    );
  });

  renderTasks(filtered);     // update list view
  if (document.getElementById('kanbanView').style.display !== 'none') {
    renderKanban(filtered);   // update Kanban view if visible
  }
};
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', filterTasks);

  // === SHARE TASK FUNCTIONALITY ===
  const openShareModal = (taskId) => {
    document.getElementById('shareTaskId').value = taskId;
    document.getElementById('shareEmail').value = '';
    const modal = new bootstrap.Modal(document.getElementById('shareModal'));
    modal.show();
  };

  // Share task button handler
  const shareTaskBtn = document.getElementById('shareTaskBtn');
  if (shareTaskBtn) {
    shareTaskBtn.addEventListener('click', async () => {
      const taskId = document.getElementById('shareTaskId').value;
      const email = document.getElementById('shareEmail').value.trim();

      if (!email) {
        alert('Please enter an email address');
        return;
      }

      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        alert('Please enter a valid email address');
        return;
      }

      try {
        const res = await fetch('http://localhost:8000/share_task.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify({
            task_id: parseInt(taskId),
            shared_with_email: email
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          alert('Task shared successfully!');
          const modal = bootstrap.Modal.getInstance(document.getElementById('shareModal'));
          if (modal) modal.hide();
        } else {
          alert(data.message || 'Failed to share task');
        }
      } catch (err) {
        console.error('Share task error:', err);
        alert('Server error while sharing task');
      }
    });
  }

});
