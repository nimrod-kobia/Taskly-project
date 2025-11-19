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

    // Show loading state
    const tbody = document.getElementById('taskTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border spinner-border-sm me-2" role="status"></div>Loading tasks...</td></tr>';
    }
    
    // Get sort preference
    const sortSelect = document.getElementById('sortSelect');
    const sort = sortSelect ? sortSelect.value : 'score';
    
    // If 'past_tasks' is selected, we'll filter client-side for completed tasks
    const isPastTasks = sort === 'past_tasks';
    const actualSort = isPastTasks ? 'created_at' : sort;

    try {
      const token = getToken();
      
      // Fetch both owned and shared tasks in parallel for better performance
      const [ownedRes, sharedRes] = await Promise.all([
        fetch(`http://localhost:8000/tasks/get_tasks.php`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/share_task.php', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => {
          console.warn('Could not fetch shared tasks:', err);
          return { ok: false };
        })
      ]);

      const data = await ownedRes.json();

      if (!ownedRes.ok) {
        console.error('Fetch tasks error:', data);
        showNotification('Error', 'Failed to load tasks: ' + (data.message || 'Unknown error'), 'error');
        return;
      }

      let ownedTasks = Array.isArray(data.tasks) ? data.tasks : Object.values(data.tasks);
      
      // Process shared tasks if the request succeeded
      let sharedTasks = [];
      if (sharedRes.ok) {
        const sharedData = await sharedRes.json();
        if (sharedData.success) {
          sharedTasks = (sharedData.shared_tasks || []).map(st => ({
            ...st.task,
            isShared: true,
            sharedBy: st.shared_by_name,
            sharedByEmail: st.shared_by_email,
            shareId: st.share_id
          }));
        }
      }
      
      // Combine owned and shared tasks
      tasks = [...ownedTasks, ...sharedTasks];
      
      // Filter for past tasks (completed only) if that view is selected
      if (isPastTasks) {
        tasks = tasks.filter(task => task.status === 'done');
      }
      
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
      // Find the task to check its due_date
      const task = tasks.find(t => t.id == id);
      const today = new Date().toISOString().split('T')[0];
      
      // Prepare update data
      const updateData = { 
        id: id, 
        status: 'done'
      };
      
      // If task has a due_date in the future, update it to today
      if (task && task.due_date) {
        const dueDate = new Date(task.due_date);
        const todayDate = new Date(today);
        
        if (dueDate > todayDate) {
          updateData.due_date = today;
        }
      }
      
      const res = await fetch('http://localhost:8000/tasks.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(updateData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('Success', 'Task marked as done!', 'success');
        fetchTasks();
      } else {
        showNotification('Error', data.error || data.message || 'Failed to update task', 'error');
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
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No tasks found</td></tr>`;
      return;
    }

    // Use DocumentFragment for better performance with many tasks
    const fragment = document.createDocumentFragment();
    
    tasks.forEach(task => {
      const tr = document.createElement('tr');
      const score = task.score || 0;
      const scoreColor = score >= 15 ? 'danger' : score >= 10 ? 'warning' : 'success';
      
      const reminderIcon = task.reminder_enabled ? '<i class="bi bi-bell-fill text-warning" title="Reminder enabled"></i> ' : '';
      
      // Show different icons for incoming vs outgoing shares
      let sharedIcon = '';
      let sharedInfo = '';
      
      if (task.isShared) {
        // Task shared WITH you (incoming)
        sharedIcon = '<i class="bi bi-share-fill text-info" title="Shared by ' + task.sharedBy + '"></i> ';
        sharedInfo = '<br><small class="text-muted"><i class="bi bi-person"></i> Shared by ' + task.sharedBy + '</small>';
      } else if (task.has_been_shared && task.shared_count > 0) {
        // Task you shared WITH others (outgoing)
        sharedIcon = '<i class="bi bi-send-fill text-success" title="Shared with ' + task.shared_count + ' person(s)"></i> ';
        sharedInfo = '<br><small class="text-muted"><i class="bi bi-people"></i> Shared with ' + task.shared_count + ' person(s)</small>';
      }
      
      // Normalize status and get proper display values
      const status = (task.status || 'todo').toLowerCase();
      let statusBadge = '';
      
      if (status === 'done') {
        statusBadge = '<span class="badge bg-success">Done</span>';
      } else if (status === 'inprogress') {
        statusBadge = '<span class="badge bg-primary">In Progress</span>';
      } else {
        // Default to 'To Do' for 'todo', 'pending', or any other status
        statusBadge = '<span class="badge bg-secondary">To Do</span>';
      }
      
      // Format due date properly
      let dueDateDisplay = '';
      if (task.due_date) {
        try {
          const dueDate = new Date(task.due_date);
          dueDateDisplay = dueDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        } catch (e) {
          dueDateDisplay = task.due_date;
        }
      }
      
      tr.innerHTML = `
        <td><span class="badge bg-${scoreColor}">${score}</span></td>
        <td>${sharedIcon}${reminderIcon}${task.title}</td>
        <td>${task.description || ''}${sharedInfo}</td>
        <td>${dueDateDisplay || '<span class="text-muted">No deadline</span>'}</td>
        <td>${statusBadge}</td>
        <td>
          ${!task.isShared ? `<button class="btn btn-sm btn-primary edit-btn" data-id="${task.id}">Edit</button>` : ''}
          ${!task.isShared ? `<button class="btn btn-sm btn-info share-btn" data-id="${task.id}">
            <i class="bi bi-share"></i> Share
          </button>` : ''}
          ${task.status !== 'done' && !task.isShared ? `<button class="btn btn-sm btn-success done-btn" data-id="${task.id}" title="Mark as Done">
            <i class="bi bi-check-circle"></i> Done
          </button>` : ''}
          ${!task.isShared ? 
            `<button class="btn btn-sm btn-danger delete-btn" data-id="${task.id}">Delete</button>` :
            `<span class="badge bg-info">View Only</span>`}
        </td>
      `;
      fragment.appendChild(tr);
    });
    
    // Append all rows at once for better performance
    tbody.appendChild(fragment);

    // Use event delegation for better performance with many tasks
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      
      const taskId = btn.dataset.id;
      if (btn.classList.contains('edit-btn')) {
        openEditModal(taskId);
      } else if (btn.classList.contains('share-btn')) {
        openShareModal(taskId);
      } else if (btn.classList.contains('delete-btn')) {
        deleteTask(taskId);
      } else if (btn.classList.contains('done-btn')) {
        markAsDone(taskId);
      }
    });
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
          const sharedInfo = task.is_shared && task.shared_by 
            ? `\n👥 Shared by ${task.shared_by}` 
            : '';
          
          showNotification(
            '⏰ Task Reminder', 
            `"${task.title}" is due ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'soon'}!${sharedInfo}\nClick to start working on it.`,
            'warning'
          );
        });
        
        // Auto-transition reminded tasks to 'inprogress' (only for owned tasks, not shared ones)
        for (const task of data.reminders) {
          if (!task.is_shared) {
            await fetch('http://localhost:8000/tasks.php', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
              },
              body: JSON.stringify({ id: task.id, status: 'inprogress' })
            });
          }
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
    // Normalize status - handle various formats
    const status = (task.status || 'todo').toLowerCase().replace(/[^a-z]/g, '');
    
    // Map variations to standard status keys
    if (status === 'done' || status === 'completed') {
      statusGroups.done.push(task);
    } else if (status === 'inprogress' || status === 'in progress' || status === 'progress') {
      statusGroups.inprogress.push(task);
    } else {
      // Default to todo for 'todo', 'pending', or any other status
      statusGroups.todo.push(task);
    }
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
      
      // Calculate score and determine color
      const score = task.score || 0;
      const scoreColor = score >= 15 ? 'danger' : score >= 10 ? 'warning' : 'success';
      
      // Format due date for better readability
      let dueDateDisplay = 'N/A';
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          dueDateDisplay = `<span class="text-danger">${task.due_date} (Overdue)</span>`;
        } else if (diffDays === 0) {
          dueDateDisplay = `<span class="text-warning">${task.due_date} (Today)</span>`;
        } else if (diffDays === 1) {
          dueDateDisplay = `<span class="text-warning">${task.due_date} (Tomorrow)</span>`;
        } else {
          dueDateDisplay = task.due_date;
        }
      }
      
      const reminderIcon = task.reminder_enabled ? '<i class="bi bi-bell-fill text-warning" title="Reminder enabled"></i> ' : '';
      
      taskCard.innerHTML = `
        <div class="card-body p-2">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <h6 class="card-title mb-0">${reminderIcon}${task.title}</h6>
            <span class="badge bg-${scoreColor}" title="Priority Score">${score}</span>
          </div>
          <p class="card-text mb-1 small">${task.description || ''}</p>
          <p class="card-text mb-0 small text-muted">Due: ${dueDateDisplay}</p>
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
  let emailList = [];
  
  const updateEmailChips = () => {
    const chipsContainer = document.getElementById('emailChips');
    const emailCountSpan = document.getElementById('emailCount');
    
    chipsContainer.innerHTML = emailList.map((email, index) => `
      <span class="badge bg-primary" style="padding: 8px 12px; font-size: 14px;">
        ${email}
        <i class="bi bi-x-circle ms-1" style="cursor: pointer;" onclick="removeEmail(${index})"></i>
      </span>
    `).join('');
    
    emailCountSpan.textContent = emailList.length;
  };
  
  window.removeEmail = (index) => {
    emailList.splice(index, 1);
    updateEmailChips();
  };
  
  const addEmail = () => {
    const emailInput = document.getElementById('shareEmail');
    const email = emailInput.value.trim();
    
    if (!email) return;
    
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      showNotification('Warning', 'Please enter a valid email address', 'warning');
      return;
    }
    
    if (emailList.includes(email)) {
      showNotification('Warning', 'Email already added', 'warning');
      return;
    }
    
    emailList.push(email);
    emailInput.value = '';
    updateEmailChips();
  };
  
  const openShareModal = (taskId) => {
    document.getElementById('shareTaskId').value = taskId;
    document.getElementById('shareEmail').value = '';
    const resultsDiv = document.getElementById('shareResults');
    resultsDiv.classList.add('share-results-hidden');
    resultsDiv.classList.remove('share-results-visible');
    emailList = [];
    updateEmailChips();
    const modal = new bootstrap.Modal(document.getElementById('shareModal'));
    modal.show();
  };
  
  // Add email button
  const addEmailBtn = document.getElementById('addEmailBtn');
  if (addEmailBtn) {
    addEmailBtn.addEventListener('click', addEmail);
  }
  
  // Enter key to add email
  const shareEmailInput = document.getElementById('shareEmail');
  if (shareEmailInput) {
    shareEmailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addEmail();
      }
    });
  }

  // Share task button handler
  const shareTaskBtn = document.getElementById('shareTaskBtn');
  if (shareTaskBtn) {
    shareTaskBtn.addEventListener('click', async () => {
      const taskId = document.getElementById('shareTaskId').value;

      if (emailList.length === 0) {
        showNotification('Warning', 'Please add at least one email address', 'warning');
        return;
      }

      try {
        shareTaskBtn.disabled = true;
        shareTaskBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sharing...';
        
        const res = await fetch('http://localhost:8000/share_task.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify({
            task_id: parseInt(taskId),
            shared_with_emails: emailList
          })
        });

        const data = await res.json();

        if (res.ok && data.results) {
          // Display detailed results
          const resultsContainer = document.getElementById('shareResultsList');
          const resultsDiv = document.getElementById('shareResults');
          
          resultsContainer.innerHTML = data.results.map(result => `
            <div class="alert alert-${result.success ? 'success' : 'danger'} py-2 mb-2">
              <i class="bi bi-${result.success ? 'check-circle-fill' : 'x-circle-fill'}"></i>
              <strong>${result.email}</strong>: ${result.message}
              ${result.email_sent ? '<i class="bi bi-envelope-check ms-2" title="Email sent"></i>' : ''}
            </div>
          `).join('');
          
          resultsDiv.classList.remove('share-results-hidden');
          resultsDiv.classList.add('share-results-visible');
          
          showNotification(
            data.success_count > 0 ? 'Success' : 'Error',
            data.message,
            data.success_count > 0 ? 'success' : 'error'
          );
          
          // Clear email list if all succeeded
          if (data.failure_count === 0) {
            emailList = [];
            updateEmailChips();
            setTimeout(() => {
              const modal = bootstrap.Modal.getInstance(document.getElementById('shareModal'));
              if (modal) modal.hide();
              loadTasks(); // Reload tasks to show updated share count
            }, 2000);
          }
        } else {
          showNotification('Error', data.message || 'Failed to share task', 'error');
        }
      } catch (err) {
        console.error('Share task error:', err);
        showNotification('Error', 'Server error while sharing task', 'error');
      } finally {
        shareTaskBtn.disabled = false;
        shareTaskBtn.innerHTML = '<i class="bi bi-send"></i> Share with <span id="emailCount">' + emailList.length + '</span> recipient(s)';
      }
    });
  }

});
