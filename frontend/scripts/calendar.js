import { supabase } from './supabase.js';
import { setupNavbarAuth } from './main.js';

document.addEventListener('DOMContentLoaded', async () => {
  await setupNavbarAuth();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error('Error fetching user:', userError);
    return;
  }

  if (!user) {
    console.warn('No user logged in — redirecting...');
    window.location.href = 'login.html';
    return;
  }

  // Fetch tasks
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, status, deadline, created_at, urgency')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error loading tasks:', error);
    return;
  }

  // Urgency colors
  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high':
      case 3: return '#dc3545'; // 🔴 High
      case 'medium':
      case 2: return '#ffc107'; // 🟡 Medium
      case 'low':
      case 1: return '#198754'; // 🟢 Low
      default: return '#6c757d'; // ⚪ None
    }
  };

  // Map to FullCalendar event format
  const events = (tasks || []).map(t => ({
    id: t.id,
    title: `${t.title} (${t.status || 'pending'})`,
    start: t.deadline || t.created_at,
    color: getUrgencyColor(t.urgency)
  }));

  // ✅ Initialize FullCalendar (global version)
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
