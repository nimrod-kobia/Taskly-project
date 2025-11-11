// scripts/dashboard.js
document.addEventListener('DOMContentLoaded', () => {
  const getToken = () => localStorage.getItem('jwt');
  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login.html';
  };

  const getCurrentUser = () => {
    const token = getToken();
    if (!token) return logout();

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) return logout();
      return payload;
    } catch {
      return logout();
    }
  };

  const fetchTasks = async () => {
    const user = getCurrentUser();
    if (!user) return;

    try {
      const res = await fetch('http://localhost:8000/tasks/get_tasks.php', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (!res.ok) throw new Error('Failed to fetch tasks');

      const data = await res.json();
      const tasks = data.tasks || [];

      renderStats(tasks);
      renderTable(tasks);
    } catch (err) {
      console.error(err);
      alert('Error fetching tasks. Please login again.');
      logout();
    }
  };

  const renderStats = (tasks) => {
    document.getElementById('totalTasks').textContent = tasks.length;
    document.getElementById('completedTasks').textContent = tasks.filter(t => t.status.toLowerCase() === 'done').length;
    document.getElementById('inProgressTasks').textContent = tasks.filter(t => t.status.toLowerCase() === 'inprogress').length;
    const now = new Date();
    document.getElementById('overdueTasks').textContent = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status.toLowerCase() !== 'done').length;
  };

  const renderTable = (tasks) => {
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
  };

  // Fetch tasks on load
  fetchTasks();
});
