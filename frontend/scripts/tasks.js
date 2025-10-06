import { supabase } from './supabase.js';
import { setupNavbarAuth, getCurrentUser } from './main.js';

async function fetchTasks() {
  const user = await getCurrentUser();
  if (!user) return;

  await setupNavbarAuth(); // dynamically update navbar

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return console.error(error);

  const tbody = document.getElementById('taskList');
  tbody.innerHTML = '';

  tasks.forEach(task => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${task.title}</td>
      <td>${task.description || ''}</td>
      <td>${task.deadline ? new Date(task.deadline).toLocaleDateString() : ''}</td>
      <td>${task.urgency || ''}</td>
      <td>${task.status}</td>
      <td>${task.effort || 0}h</td> 
      <td>
        <button class="btn btn-sm btn-success me-1" data-id="${task.id}" data-action="edit">Edit</button>
        <button class="btn btn-sm btn-danger" data-id="${task.id}" data-action="delete">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Add Edit/Delete button listeners
  tbody.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', handleTaskAction);
  });
}

// Handle Edit/Delete
async function handleTaskAction(e) {
  const btn = e.target;
  const taskId = btn.dataset.id;
  const action = btn.dataset.action;
  const user = await getCurrentUser();
  if (!user) return;

  if (action === 'delete') {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) return alert('Error deleting task: ' + error.message);
  } else if (action === 'edit') {
    // Populate modal with task info
    const { data: [task] } = await supabase.from('tasks').select('*').eq('id', taskId)
    if (!task) return alert('Task not found')
    document.getElementById('taskId').value = task.id
    document.getElementById('title').value = task.title
    document.getElementById('description').value = task.description
    document.getElementById('deadline').value = task.deadline ? task.deadline.split('T')[0] : ''
    document.getElementById('status').value = task.status
    document.getElementById('urgency').value = task.urgency || 'medium'
    document.getElementById('effort').value = task.effort || 1 
    const modal = new bootstrap.Modal(document.getElementById('taskModal'))
    modal.show()
  }

  fetchTasks();
}

// Form submit for new/edit task
document.getElementById('taskForm').addEventListener('submit', async e => {
  e.preventDefault();
  const user = await getCurrentUser();
  if (!user) return;

  const id = document.getElementById('taskId').value
  const title = document.getElementById('title').value
  const description = document.getElementById('description').value
  const deadline = document.getElementById('deadline').value || null
  const status = document.getElementById('status').value
  const urgency = document.getElementById('urgency').value
  const effort = document.getElementById('effort').value || 0 

  if (!title) return alert('Title is required');

  if (id) {
    // Update task
    const { error } = await supabase.from('tasks').update({
      title, description, deadline, status, urgency, effort 
    }).eq('id', id)
    if (error) return alert('Error updating task: ' + error.message)
  } else {
    // Insert new task
    const { error } = await supabase.from('tasks').insert([{
      user_id: user.id,
      title,
      description,
      deadline,
      status,
      urgency,
      effort 
    }])
    if (error) return alert('Error creating task: ' + error.message)
  }

  document.getElementById('taskForm').reset();
  document.getElementById('taskId').value = '';
  bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();

  fetchTasks();
});

// Load tasks on page load
document.addEventListener('DOMContentLoaded', fetchTasks);
