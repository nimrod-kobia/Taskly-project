import { supabase } from './supabase.js';
import { setupNavbarAuth } from './main.js';

async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function renderProfile() {
  const user = await getCurrentUser();
  if (!user) return;

  // Update navbar dynamically
  await setupNavbarAuth();

  // User info
  document.getElementById('userName').textContent = user.user_metadata?.full_name || user.email;
  document.getElementById('userEmail').textContent = user.email;
  document.getElementById('memberSince').textContent = new Date(user.created_at).toLocaleDateString();

  // Account settings form
  document.getElementById('fullName').value = user.user_metadata?.full_name || '';
  document.getElementById('email').value = user.email;

  // Fetch tasks for stats
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }

  const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
  const tasksPending = tasks.filter(t => t.status === 'pending').length;

  document.getElementById('tasksCompleted').textContent = tasksCompleted;
  document.getElementById('tasksPending').textContent = tasksPending;

  // Chart.js for monthly task summary
  const ctx = document.getElementById('tasksChart')?.getContext('2d');
  if (ctx) {
    const tasksOverTimeMap = {};
    tasks.forEach(t => {
      const date = t.created_at.split('T')[0];
      if (!tasksOverTimeMap[date]) tasksOverTimeMap[date] = { completed: 0, pending: 0 };
      t.status === 'completed' ? tasksOverTimeMap[date].completed++ : tasksOverTimeMap[date].pending++;
    });

    const tasksOverTime = Object.entries(tasksOverTimeMap).map(([date, counts]) => ({
      date, completed: counts.completed, pending: counts.pending
    }));

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: tasksOverTime.map(t => t.date),
        datasets: [
          { label: 'Completed', data: tasksOverTime.map(t => t.completed), backgroundColor: 'rgba(40,167,69,0.8)' },
          { label: 'Pending', data: tasksOverTime.map(t => t.pending), backgroundColor: 'rgba(220,53,69,0.8)' }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Tasks Overview' } },
                 scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }
    });
  }
}

// Handle account settings form submission
document.getElementById('accountSettingsForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const user = await getCurrentUser();
  if (!user) return;

  const fullName = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // Update email
  if (email && email !== user.email) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return alert('Error updating email: ' + error.message);
  }

  // Update password
  if (password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return alert('Error updating password: ' + error.message);
  }

  // Update full name metadata
  if (fullName) {
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (error) return alert('Error updating name: ' + error.message);
  }

  alert('Account updated successfully!');
  renderProfile(); // re-render profile after changes
});

// Run on page load
document.addEventListener('DOMContentLoaded', renderProfile);
