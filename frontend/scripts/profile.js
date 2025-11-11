// profile.js
document.addEventListener('DOMContentLoaded', () => {

  const tasksCompletedEl = document.getElementById('tasksCompleted');
  const tasksPendingEl = document.getElementById('tasksPending');
  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  const memberSinceEl = document.getElementById('memberSince');
  const ctx = document.getElementById('tasksChart')?.getContext('2d');
  let tasksChart;

  // ===== JWT Helpers =====
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
    } catch (err) {
      console.error('Invalid token', err);
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    window.location.replace('login.html');
  };

  // ===== Fetch Tasks =====
  const fetchAndRenderTasks = async () => {
    try {
      const res = await fetch('http://localhost:8000/tasks/get_tasks.php', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      const tasks = Array.isArray(data.tasks) ? data.tasks : Object.values(data.tasks);

      const completed = tasks.filter(t => t.status.toLowerCase() === 'done').length;
      const pending = tasks.length - completed;

      tasksCompletedEl.textContent = completed;
      tasksPendingEl.textContent = pending;

      // Chart: tasks per day
      const dayMap = {};
      tasks.forEach(t => {
        const day = new Date(t.created_at).toLocaleDateString();
        if (!dayMap[day]) dayMap[day] = { completed: 0, pending: 0 };
        t.status.toLowerCase() === 'done' ? dayMap[day].completed++ : dayMap[day].pending++;
      });

      const labels = Object.keys(dayMap);
      const completedData = labels.map(d => dayMap[d].completed);
      const pendingData = labels.map(d => dayMap[d].pending);

      if (ctx) {
        if (tasksChart) {
          tasksChart.data.labels = labels;
          tasksChart.data.datasets[0].data = completedData;
          tasksChart.data.datasets[1].data = pendingData;
          tasksChart.update();
        } else {
          tasksChart = new Chart(ctx, {
            type: 'bar',
            data: {
              labels,
              datasets: [
                { label: 'Completed', data: completedData, backgroundColor: 'rgba(40,167,69,0.8)' },
                { label: 'Pending', data: pendingData, backgroundColor: 'rgba(220,53,69,0.8)' }
              ]
            },
            options: {
              responsive: true,
              plugins: { legend: { position: 'top' }, title: { display: true, text: 'Tasks Overview' } },
              scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
            }
          });
        }
      }

    } catch (err) {
      console.error('Error fetching tasks for profile:', err);
    }
  };

  // ===== Fetch Profile Info =====
  const renderProfileInfo = async () => {
  const token = getToken();
  if (!token) {
    userNameEl.textContent = 'Unknown';
    userEmailEl.textContent = 'Unknown';
    memberSinceEl.textContent = 'Unknown';
    return;
  }

  try {
    const res = await fetch('http://localhost:8000/Users/get_user.php', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Fetch /get_user.php status:', res.status);

    const data = await res.json();
    console.log('User data:', data);

    const user = data.user || {};

    userNameEl.textContent = user.name || 'Unknown';
    userEmailEl.textContent = user.email || 'Unknown';
    memberSinceEl.textContent = user.registered_at
      ? new Date(user.registered_at).toLocaleDateString()
      : 'Unknown';

    document.getElementById('fullName').value = user.name || '';
    document.getElementById('email').value = user.email || '';

  } catch (err) {
    console.error('Error fetching user info:', err);
    userNameEl.textContent = 'Unknown';
    userEmailEl.textContent = 'Unknown';
    memberSinceEl.textContent = 'Unknown';
  }
};

  // ===== Global refresh =====
  window.profileRefresh = async () => {
    await renderProfileInfo();
    await fetchAndRenderTasks();
  };

  // ===== Account Settings Form =====
  document.getElementById('accountSettingsForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/Backend/user/update_user.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ fullName, email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Account updated successfully!');
        window.profileRefresh();
      } else {
        alert(data.error || 'Failed to update account.');
      }
    } catch (err) {
      console.error('Error updating account:', err);
      alert('Server error while updating account.');
    }
  });

  // ===== Initial load & auto-refresh every 5s =====
  window.profileRefresh();
  setInterval(window.profileRefresh, 5000);

});
