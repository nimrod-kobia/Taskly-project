document.addEventListener('DOMContentLoaded', () => {

  // === NOTIFICATION HELPER ===
  const showNotification = (title, message, type = 'info') => {
    const toastEl = document.getElementById('notificationToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');
    const toastHeader = toastEl.querySelector('.toast-header');
    
    // Set colors based on type
    toastHeader.className = 'toast-header';
    if (type === 'success') {
      toastHeader.classList.add('bg-success', 'text-white');
    } else if (type === 'error') {
      toastHeader.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
      toastHeader.classList.add('bg-warning');
    } else {
      toastHeader.classList.add('bg-primary', 'text-white');
    }
    
    toastTitle.textContent = title;
    toastBody.textContent = message;
    
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
  };

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
    
    // If 'past_tasks' is selected, we'll filter client-side for completed tasks
    const isPastTasks = sort === 'past_tasks';
    const actualSort = isPastTasks ? 'created_at' : sort;

    try {
      const res = await fetch(`http://localhost:8000/tasks.php?user_id=${user.user_id}&sort=${actualSort}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);

      if (!res.ok) {
        console.error('Fetch tasks error:', data);
        showNotification('Error', 'Failed to load tasks: ' + (data.message || 'Unknown error'), 'error');
        return;
      }

      tasks = Array.isArray(data.tasks) ? data.tasks : Object.values(data.tasks);
      
      // Filter for past tasks (completed only) if that view is selected
      if (isPastTasks) {
        tasks = tasks.filter(task => task.status === 'done');
        console.log('Filtered to past tasks (completed):', tasks.length);
      }
      
      console.log('Tasks to render:', tasks.length);
      renderTasks(tasks);
      if (window.profileRefresh) window.profileRefresh();

    } catch (err) {
      console.error('Error fetching tasks:', err);
      showNotification('Error', 'Server error while loading tasks: ' + err.message, 'error');
    }
  };

  // === CREATE / UPDATE TASK ===
  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', async e => {
      e.preventDefault();

      const currentStatus = document.getElementById('status').value;
      const reminderEnabled = document.getElementById('reminderEnabled').checked;
      
      const taskData = {
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        due_date: document.getElementById('deadline').value,
        priority: document.getElementById('priority').value,
        urgency: parseInt(document.getElementById('urgency').value) || 5,
        effort: parseInt(document.getElementById('effort').value) || 1,
        status: currentStatus,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderEnabled ? document.getElementById('reminderTime').value : null
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
          showNotification('Error', data.message || data.error || 'Failed to save task', 'error');
        }

      } catch (err) {
        console.error('Task save error:', err);
        showNotification('Error', 'Server error while saving task', 'error');
      }
    });
  }

  // === MARK AS DONE ===
  const markAsDone = async id => {
    try {
      const res = await fetch('http://localhost:8000/tasks.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ id: id, status: 'done' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('Success', 'Task marked as done!', 'success');
        fetchTasks();
      } else {
        showNotification('Error', data.error || 'Failed to update task', 'error');
      }
    } catch (err) {
      console.error('Mark as done error:', err);
      showNotification('Error', 'Server error while updating task', 'error');
    }
  };

  // === DELETE TASK ===
  const deleteTask = async id => {
    if (!confirm('Delete this task?')) return;

    try {
      const res = await fetch(`http://localhost:8000/tasks.php?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('Success', 'Task deleted successfully', 'success');
        fetchTasks();
      } else {
        showNotification('Error', data.error || 'Failed to delete task', 'error');
      }
    } catch (err) {
      console.error('Delete task error:', err);
      showNotification('Error', 'Server error while deleting task', 'error');
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
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No tasks found</td></tr>`;
      return;
    }

    console.log('Rendering', tasks.length, 'tasks');
    tasks.forEach(task => {
      const tr = document.createElement('tr');
      const score = task.score || 0;
      const scoreColor = score >= 15 ? 'danger' : score >= 10 ? 'warning' : 'success';
      
      const reminderIcon = task.reminder_enabled ? '<i class="bi bi-bell-fill text-warning" title="Reminder enabled"></i> ' : '';
      
      tr.innerHTML = `
        <td><span class="badge bg-${scoreColor}">${score}</span></td>
        <td>${reminderIcon}${task.title}</td>
        <td>${task.description || ''}</td>
        <td>${task.due_date || ''}</td>
        <td><span class="badge bg-${task.status === 'done' ? 'success' : task.status === 'inprogress' ? 'primary' : 'secondary'}">${task.status || ''}</span></td>
        <td>
          <button class="btn btn-sm btn-primary edit-btn" data-id="${task.id}">Edit</button>
          <button class="btn btn-sm btn-info share-btn" data-id="${task.id}">
            <i class="bi bi-share"></i> Share
          </button>
          ${task.status !== 'done' ? `<button class="btn btn-sm btn-success done-btn" data-id="${task.id}" title="Mark as Done">
            <i class="bi bi-check-circle"></i> Done
          </button>` : ''}
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

    tbody.querySelectorAll('.done-btn').forEach(btn =>
      btn.addEventListener('click', () => markAsDone(btn.dataset.id))
    );
  };

  const openEditModal = taskId => {
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;

    document.getElementById('title').value = task.title;
    document.getElementById('description').value = task.description || '';
    document.getElementById('deadline').value = task.due_date || '';
    document.getElementById('priority').value = task.priority || 'medium';
    document.getElementById('urgency').value = task.urgency || 5;
    document.getElementById('status').value = task.status || '';
    document.getElementById('effort').value = task.effort || 1;
    
    // Set reminder fields
    const reminderEnabled = task.reminder_enabled || false;
    document.getElementById('reminderEnabled').checked = reminderEnabled;
    if (reminderEnabled && task.reminder_time) {
      // Convert timestamp to datetime-local format
      const reminderDate = new Date(task.reminder_time);
      const formattedTime = reminderDate.toISOString().slice(0, 16);
      document.getElementById('reminderTime').value = formattedTime;
      document.getElementById('reminderTimeContainer').style.display = 'block';
    } else {
      document.getElementById('reminderTime').value = '';
      document.getElementById('reminderTimeContainer').style.display = 'none';
    }

    // If status changes from 'todo' to anything else, auto-set to 'inprogress'
    if (task.status === 'todo') {
      document.getElementById('status').addEventListener('change', function handler(e) {
        if (e.target.value !== 'todo' && e.target.value !== 'done') {
          e.target.value = 'inprogress';
        }
        e.target.removeEventListener('change', handler);
      });
    }

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

  // === CHECK REMINDERS ===
  const checkReminders = async () => {
    const user = getCurrentUser();
    if (!user) return;

    try {
      const res = await fetch(`http://localhost:8000/check_reminders.php?user_id=${user.user_id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      
      if (res.ok && data.success && data.reminders.length > 0) {
        data.reminders.forEach(task => {
          showNotification(
            '⏰ Task Reminder', 
            `"${task.title}" is due ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'soon'}!\nClick to start working on it.`,
            'warning'
          );
        });
        
        // Auto-transition reminded tasks to 'inprogress'
        for (const task of data.reminders) {
          await fetch('http://localhost:8000/tasks.php', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ id: task.id, status: 'inprogress' })
          });
        }
        
        // Refresh tasks to show updated statuses
        fetchTasks();
      }
    } catch (err) {
      console.error('Error checking reminders:', err);
    }
  };

  // === REMINDER CHECKBOX TOGGLE ===
  const reminderCheckbox = document.getElementById('reminderEnabled');
  const reminderTimeContainer = document.getElementById('reminderTimeContainer');
  
  if (reminderCheckbox) {
    reminderCheckbox.addEventListener('change', (e) => {
      reminderTimeContainer.style.display = e.target.checked ? 'block' : 'none';
      if (!e.target.checked) {
        document.getElementById('reminderTime').value = '';
      }
    });
  }

  // === MODAL RESET ===
  const taskModal = document.getElementById('taskModal');
  if (taskModal) {
    taskModal.addEventListener('hidden.bs.modal', () => {
      taskForm.reset();
      delete taskForm.dataset.editId;
      document.getElementById('reminderEnabled').checked = false;
      document.getElementById('reminderTimeContainer').style.display = 'none';
    });
  }

  // === INITIAL LOAD ===
  // ✅ Only call fetchTasks if a token exists and is valid
  if (getToken()) {
    fetchTasks();
    // Check reminders every 2 minutes
    checkReminders();
    setInterval(checkReminders, 120000);
  }

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
        showNotification('Warning', 'Please enter an email address', 'warning');
        return;
      }

      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        showNotification('Warning', 'Please enter a valid email address', 'warning');
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
          showNotification('Success', 'Task shared successfully!', 'success');
          const modal = bootstrap.Modal.getInstance(document.getElementById('shareModal'));
          if (modal) modal.hide();
        } else {
          showNotification('Error', data.message || 'Failed to share task', 'error');
        }
      } catch (err) {
        console.error('Share task error:', err);
        showNotification('Error', 'Server error while sharing task', 'error');
      }
    });
  }

});
