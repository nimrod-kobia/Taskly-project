import { setupNavbarAuth } from './main.js';

document.addEventListener('DOMContentLoaded', async () => {
  await setupNavbarAuth();

  const getToken = () => localStorage.getItem('jwt');

  // Redirect if no token
  if (!getToken()) {
    window.location.href = 'login.html';
    return;
  }

  // Fetch tasks from backend
  let tasks = [];
  try {
    const res = await fetch('http://localhost:8000/tasks/get_tasks.php', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch tasks');
    tasks = data.tasks || [];
  } catch (err) {
    console.error('Error fetching tasks:', err);
    alert('Failed to load tasks.');
    return;
  }

  // Urgency colors
  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'high': return '#dc3545';   // 🔴
      case 'medium': return '#ffc107'; // 🟡
      case 'low': return '#198754';    // 🟢
      default: return '#6c757d';       // ⚪
    }
  };

  // Map tasks to FullCalendar events
  const events = tasks.map(t => ({
    id: t.id,
    title: `${t.title} (${t.status || 'pending'})`,
    start: t.due_date || t.created_at,
    color: getUrgencyColor(t.priority)
  }));

  // Initialize FullCalendar
  const calendarEl = document.getElementById('calendar');
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events,
    eventClick(info) {
      alert(`Task: ${info.event.title}`);
    }
  });

  calendar.render();
});
