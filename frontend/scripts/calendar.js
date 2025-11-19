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
      // Get user ID from token
      const token = getToken();
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.user_id;
      
      // Fetch owned tasks
      const ownedRes = await fetch(`http://localhost:8000/tasks/get_tasks.php`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const ownedData = await ownedRes.json();
      if (!ownedRes.ok || !ownedData.success) throw new Error(ownedData.message || ownedData.error || 'Failed to fetch tasks');
      
      // Mark outgoing shares in owned tasks
      const ownedTasks = (ownedData.tasks || []).map(t => ({
        ...t,
        isOutgoingShare: t.has_been_shared && t.shared_count > 0,
        sharedCount: t.shared_count || 0,
        sharedWith: t.shared_with || []
      }));
      
      // Fetch shared tasks (incoming)
      let sharedTasks = [];
      try {
        const sharedRes = await fetch('http://localhost:8000/share_task.php', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const sharedData = await sharedRes.json();
        if (sharedRes.ok && sharedData.success) {
          // Extract task data from shared tasks response
          sharedTasks = (sharedData.shared_tasks || []).map(st => ({
            ...st.task,
            isShared: true,
            sharedBy: st.shared_by_name,
            sharedByEmail: st.shared_by_email
          }));
        }
      } catch (sharedErr) {
        console.warn('Could not fetch shared tasks:', sharedErr);
      }
      
      // Combine owned and shared tasks
      const allTasks = [...ownedTasks, ...sharedTasks];
      
      // Map tasks to FullCalendar events
      return allTasks.map(t => {
        const reminderIcon = t.reminder_enabled ? '🔔 ' : '';
        // Different icons: 👥 for incoming shares, 📤 for outgoing shares
        const sharedIcon = t.isShared ? '👥 ' : (t.isOutgoingShare ? '📤 ' : '');
        return {
          id: t.id,
          title: sharedIcon + reminderIcon + t.title,
          start: t.due_date || t.created_at,
          // Cyan for incoming shares, light green for outgoing shares, priority color for owned tasks
          color: t.isShared ? '#17a2b8' : (t.isOutgoingShare ? '#28a745' : getUrgencyColor(t.priority)),
          extendedProps: {
            description: t.description,
            priority: t.priority,
            status: t.status || 'todo',
            reminderEnabled: t.reminder_enabled,
            reminderTime: t.reminder_time,
            effort: t.effort,
            urgency: t.urgency,
            isShared: t.isShared || false,
            sharedBy: t.sharedBy,
            sharedByEmail: t.sharedByEmail,
            isOutgoingShare: t.isOutgoingShare || false,
            sharedCount: t.sharedCount || 0,
            sharedWith: t.sharedWith || []
          }
        };
      });
    } catch (err) {
      console.error('Error fetching tasks:', err);
      showToast('Error', 'Failed to load tasks.', 'error');
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
              <label class="form-label">Description</label>
              <textarea class="form-control" id="taskDescription" rows="3"></textarea>
            </div>
            
            <div class="row">
              <div class="col-md-6">
                <label class="form-label">Deadline</label>
                <input type="date" class="form-control" id="taskDate" value="${dateStr}">
              </div>
              <div class="col-md-6">
                <label class="form-label">Status</label>
                <select class="form-select" id="taskStatus">
                  <option value="todo" selected>To Do</option>
                  <option value="inprogress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
            
            <div class="row mt-3">
              <div class="col-md-6">
                <label class="form-label">Priority</label>
                <select class="form-select" id="taskPriority">
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Estimated Effort (hours)</label>
                <input type="number" min="1" max="10" class="form-control" id="taskEffort" value="1">
              </div>
            </div>
            
            <div class="mt-3">
              <label class="form-label">Urgency (1-10)</label>
              <input type="number" min="1" max="10" class="form-control" id="taskUrgency" value="5">
              <small class="text-muted">How urgent is this task? (1=low, 10=critical)</small>
            </div>
            
            <div class="mt-3">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="taskReminderEnabled">
                <label class="form-check-label" for="taskReminderEnabled">
                  Enable Reminder
                </label>
              </div>
            </div>
            
            <div class="mt-2" id="taskReminderTimeContainer" style="display:none;">
              <label class="form-label">Reminder Time</label>
              <input type="datetime-local" class="form-control" id="taskReminderTime">
              <small class="text-muted">You'll be notified when this time is reached</small>
            </div>
            
            <button type="submit" class="btn btn-primary mt-3">
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
  
  // Toggle reminder time field
  document.getElementById('taskReminderEnabled').addEventListener('change', (e) => {
    const container = document.getElementById('taskReminderTimeContainer');
    container.style.display = e.target.checked ? 'block' : 'none';
    if (!e.target.checked) {
      document.getElementById('taskReminderTime').value = '';
    }
  });
  
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
    // Get user ID from token
    const token = getToken();
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.user_id;
    
    const response = await fetch(`http://localhost:8000/tasks.php?user_id=${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (!response.ok || !data.success) throw new Error(data.message || data.error || 'Failed to fetch tasks');
    
    const dayTasks = (data.tasks || []).filter(task => {
      const taskDate = task.due_date || task.created_at;
      return taskDate && taskDate.startsWith(dateStr);
    });
    
    const listEl = document.getElementById('dayTasksList');
    
    if (dayTasks.length === 0) {
      listEl.innerHTML = '<p class="text-muted">No tasks for this day</p>';
    } else {
      listEl.innerHTML = dayTasks.map(task => {
        const reminderIcon = task.reminder_enabled ? '<i class="bi bi-bell-fill text-warning" title="Reminder enabled"></i> ' : '';
        return `
          <div class="card mb-2">
            <div class="card-body py-2">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  ${reminderIcon}<strong>${task.title}</strong>
                  <span class="badge bg-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success'} ms-2">${task.priority}</span>
                  <span class="badge bg-${task.status === 'done' ? 'success' : task.status === 'inprogress' ? 'primary' : 'secondary'} ms-1">${task.status || 'todo'}</span>
                  ${task.description ? `<p class="mb-0 small text-muted mt-1">${task.description}</p>` : ''}
                  ${task.reminder_time ? `<p class="mb-0 small text-info mt-1"><i class="bi bi-alarm"></i> Reminder: ${new Date(task.reminder_time).toLocaleString()}</p>` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading day tasks:', err);
    document.getElementById('dayTasksList').innerHTML = '<p class="text-danger">Failed to load tasks</p>';
  }
}

// Add new task
async function addTask(dateStr, getToken) {
  // Get user ID from token
  const token = getToken();
  const payload = JSON.parse(atob(token.split('.')[1]));
  const userId = payload.user_id;
  
  const reminderEnabled = document.getElementById('taskReminderEnabled').checked;
  
  const taskData = {
    user_id: userId,
    title: document.getElementById('taskTitle').value.trim(),
    description: document.getElementById('taskDescription').value.trim(),
    due_date: document.getElementById('taskDate').value,
    priority: document.getElementById('taskPriority').value,
    status: document.getElementById('taskStatus').value,
    effort: parseInt(document.getElementById('taskEffort').value) || 1,
    urgency: parseInt(document.getElementById('taskUrgency').value) || 5,
    reminder_enabled: reminderEnabled,
    reminder_time: reminderEnabled ? document.getElementById('taskReminderTime').value : null
  };
  
  try {
    const response = await fetch('http://localhost:8000/tasks.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });
    
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || data.error || 'Failed to create task');
    
    showToast('Success', 'Task created successfully!', 'success');
  } catch (err) {
    console.error('Error creating task:', err);
    showToast('Error', 'Failed to create task: ' + err.message, 'error');
  }
}

// Toast notification helper
function showToast(title, message, type = 'info') {
  const bgClass = type === 'success' ? 'bg-success' : 
                  type === 'error' ? 'bg-danger' : 
                  type === 'warning' ? 'bg-warning' : 'bg-primary';

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-white ${bgClass} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');
  
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong>${title}</strong><br>${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  
  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
  toast.show();
  
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// Show task details when clicking an event
function showTaskDetailsModal(event) {
  const props = event.extendedProps;
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">${event.title.replace('🔔 ', '').replace('👥 ', '').replace('📤 ', '')}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          ${props.isShared ? `
            <div class="alert alert-info">
              <i class="bi bi-share"></i> <strong>Shared Task</strong>
              <br><small>Shared by: ${props.sharedBy} (${props.sharedByEmail})</small>
            </div>
          ` : ''}
          ${props.isOutgoingShare ? `
            <div class="alert alert-success">
              <i class="bi bi-send-fill"></i> <strong>Shared with Others</strong>
              <br><small>Shared with ${props.sharedCount} person(s):</small>
              ${props.sharedWith && props.sharedWith.length > 0 ? `
                <ul class="mb-0 mt-1">
                  ${props.sharedWith.map(r => `<li>${r.shared_with_email}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          ` : ''}
          <p><strong>Due Date:</strong> ${event.start.toLocaleDateString()}</p>
          ${event.start.toLocaleTimeString() !== '12:00:00 AM' ? `<p><strong>Time:</strong> ${event.start.toLocaleTimeString()}</p>` : ''}
          <p><strong>Priority:</strong> <span class="badge bg-${props.priority === 'high' ? 'danger' : props.priority === 'medium' ? 'warning' : 'success'}">${props.priority || 'medium'}</span></p>
          <p><strong>Status:</strong> <span class="badge bg-${props.status === 'done' ? 'success' : props.status === 'inprogress' ? 'primary' : 'secondary'}">${props.status || 'todo'}</span></p>
          ${props.effort ? `<p><strong>Effort:</strong> ${props.effort} hours</p>` : ''}
          ${props.description ? `<p><strong>Description:</strong> ${props.description}</p>` : ''}
          ${props.reminderEnabled ? `
            <div class="alert alert-warning">
              <i class="bi bi-bell-fill"></i> <strong>Reminder Enabled</strong>
              ${props.reminderTime ? `<br><small>Set for: ${new Date(props.reminderTime).toLocaleString()}</small>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          ${props.isShared ? 
            '<a href="shared-with-me.html" class="btn btn-primary">View Shared Tasks</a>' : 
            '<a href="tasks.html" class="btn btn-primary">Edit in Tasks</a>'}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
  modal.addEventListener('hidden.bs.modal', () => modal.remove());
}
