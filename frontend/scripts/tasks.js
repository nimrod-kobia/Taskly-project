document.addEventListener('DOMContentLoaded', () => {

  // === AUTH HELPERS ===
  const getToken = () => localStorage.getItem('jwt');
  const getCurrentUser = () => {
    const token = getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
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

  const logout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    window.location.replace('login.html');
  };

  // === TASKS ARRAY ===
  let tasks = [];

  // === FETCH TASKS ===
  const fetchTasks = async () => {
    const user = getCurrentUser();
    if (!user) return;

    try {
      const res = await fetch('/Backend/tasks/get_tasks.php', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      tasks = Array.isArray(data.tasks) ? data.tasks : Object.values(data.tasks);

      if (!res.ok) {
        console.error('Fetch tasks error:', data);
        return;
      }

      renderTasks(tasks);
      if (window.profileRefresh) window.profileRefresh();

    } catch (err) {
      console.error('Error fetching tasks:', err);
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

      try {
        let url, method;
        if (editId) {
          url = `/Backend/tasks/update_task.php?id=${editId}`;
          method = 'POST';
        } else {
          url = '/Backend/tasks/create_task.php';
          method = 'POST';
        }

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify(taskData)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          // Close modal
          const modalInstance = bootstrap.Modal.getInstance(document.getElementById('taskModal'));
          if (modalInstance) modalInstance.hide();

          // Reset form and remove editId
          taskForm.reset();
          delete taskForm.dataset.editId;

          // Update tasks array instantly
          if (editId && data.task) {
            const index = tasks.findIndex(t => t.id == editId);
            if (index !== -1) tasks[index] = data.task;
          }

          // Refresh table
          fetchTasks();
        } else {
          alert(data.error || 'Failed to save task.');
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
      const res = await fetch(`/Backend/tasks/delete_task.php?id=${id}`, {
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
    const tbody = document.getElementById('taskList');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!tasks.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No tasks found</td></tr>`;
      return;
    }

    tasks.forEach(task => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${task.title}</td>
        <td>${task.description || ''}</td>
        <td>${task.due_date || ''}</td>
        <td>${task.priority || ''}</td>
        <td>${task.status || ''}</td>
        <td>
          <button class="btn btn-sm btn-primary edit-btn" data-id="${task.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${task.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach edit handlers
    tbody.querySelectorAll('.edit-btn').forEach(btn =>
      btn.addEventListener('click', () => openEditModal(btn.dataset.id))
    );

    // Attach delete handlers
    tbody.querySelectorAll('.delete-btn').forEach(btn =>
      btn.addEventListener('click', () => deleteTask(btn.dataset.id))
    );
  };

  // === OPEN EDIT MODAL ===
  const openEditModal = taskId => {
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;

    document.getElementById('title').value = task.title;
    document.getElementById('description').value = task.description || '';
    document.getElementById('deadline').value = task.due_date || '';
    document.getElementById('urgency').value = task.priority || '';
    document.getElementById('status').value = task.status || '';
    document.getElementById('effort').value = task.effort || 1;

    // Store task id for update
    taskForm.dataset.editId = taskId;

    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
  };

  // === LOGOUT BUTTON ===
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // === INITIAL LOAD ===
  fetchTasks();
});
