let calendar;

document.addEventListener('DOMContentLoaded', async () => {
  const getToken = () => localStorage.getItem('jwt') || sessionStorage.getItem('jwt');

  // Redirect if no token
  if (!getToken()) {
    window.location.href = 'login.html';
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

  // Fetch tasks from backend
  const fetchTasks = async () => {
    try {
      const res = await fetch('http://localhost:8000/tasks/get_tasks.php', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tasks');
      
      // Map tasks to FullCalendar events
      return (data.tasks || []).map(t => ({
        id: t.id,
        title: t.title,
        start: t.due_date || t.created_at,
        color: getUrgencyColor(t.priority),
        extendedProps: {
          description: t.description,
          priority: t.priority,
          status: t.status || 'pending'
        }
      }));
    } catch (err) {
      console.error('Error fetching tasks:', err);
      alert('Failed to load tasks.');
      return [];
    }
  };

  // Initialize FullCalendar
  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 600,
    aspectRatio: 1.5,
    handleWindowResize: true,
    windowResizeDelay: 100,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: fetchTasks,
    
    // Click on a date to view/add tasks
    dateClick: function(info) {
      showDayTasksModal(info.dateStr, getToken);
    },
    
    // Click on an event to view details
    eventClick: function(info) {
      showTaskDetailsModal(info.event);
    },
    
    editable: true,
    selectable: true
  });

  calendar.render();
});

// Show tasks for a specific day
function showDayTasksModal(dateStr, getToken) {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Tasks for ${new Date(dateStr).toLocaleDateString()}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div id="dayTasksList">
            <div class="text-center">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
          </div>
          <hr>
          <h6>Add New Task</h6>
          <form id="addTaskForm">
            <div class="mb-3">
              <label class="form-label">Title</label>
              <input type="text" class="form-control" id="taskTitle" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Time (optional)</label>
              <input type="time" class="form-control" id="taskTime">
            </div>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <textarea class="form-control" id="taskDescription" rows="2"></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label">Priority</label>
              <select class="form-select" id="taskPriority">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <input type="hidden" id="taskDate" value="${dateStr}">
            <button type="submit" class="btn btn-primary">
              <i class="bi bi-plus-circle me-2"></i>Add Task
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
  
  // Load tasks for this day
  loadDayTasks(dateStr, getToken);
  
  // Handle form submission
  document.getElementById('addTaskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addTask(dateStr, getToken);
    bsModal.hide();
    calendar.refetchEvents();
  });
  
  modal.addEventListener('hidden.bs.modal', () => modal.remove());
}

// Load tasks for specific day
async function loadDayTasks(dateStr, getToken) {
  try {
    const response = await fetch('http://localhost:8000/tasks/get_tasks.php', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Failed to fetch tasks');
    
    const dayTasks = (data.tasks || []).filter(task => {
      const taskDate = task.due_date || task.created_at;
      return taskDate && taskDate.startsWith(dateStr);
    });
    
    const listEl = document.getElementById('dayTasksList');
    
    if (dayTasks.length === 0) {
      listEl.innerHTML = '<p class="text-muted">No tasks for this day</p>';
    } else {
      listEl.innerHTML = dayTasks.map(task => `
        <div class="card mb-2">
          <div class="card-body py-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <strong>${task.title}</strong>
                <span class="badge bg-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success'} ms-2">${task.priority}</span>
                <span class="badge bg-${task.status === 'completed' ? 'success' : 'secondary'} ms-1">${task.status || 'pending'}</span>
                ${task.description ? `<p class="mb-0 small text-muted mt-1">${task.description}</p>` : ''}
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading day tasks:', err);
    document.getElementById('dayTasksList').innerHTML = '<p class="text-danger">Failed to load tasks</p>';
  }
}

// Add new task
async function addTask(dateStr, getToken) {
  const time = document.getElementById('taskTime').value;
  const dueDate = time ? `${dateStr} ${time}:00` : dateStr;
  
  const taskData = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDescription').value,
    priority: document.getElementById('taskPriority').value,
    due_date: dueDate,
    status: 'pending'
  };
  
  try {
    const response = await fetch('http://localhost:8000/tasks/create_task.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create task');
    
    alert('Task created successfully!');
  } catch (err) {
    console.error('Error creating task:', err);
    alert('Failed to create task: ' + err.message);
  }
}

// Show task details when clicking an event
function showTaskDetailsModal(event) {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">${event.title}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p><strong>Date:</strong> ${event.start.toLocaleDateString()}</p>
          ${event.start.toLocaleTimeString() !== '12:00:00 AM' ? `<p><strong>Time:</strong> ${event.start.toLocaleTimeString()}</p>` : ''}
          <p><strong>Priority:</strong> <span class="badge bg-${event.extendedProps.priority === 'high' ? 'danger' : event.extendedProps.priority === 'medium' ? 'warning' : 'success'}">${event.extendedProps.priority || 'Not set'}</span></p>
          <p><strong>Status:</strong> <span class="badge bg-${event.extendedProps.status === 'completed' ? 'success' : 'secondary'}">${event.extendedProps.status || 'pending'}</span></p>
          ${event.extendedProps.description ? `<p><strong>Description:</strong> ${event.extendedProps.description}</p>` : ''}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
  modal.addEventListener('hidden.bs.modal', () => modal.remove());
}
