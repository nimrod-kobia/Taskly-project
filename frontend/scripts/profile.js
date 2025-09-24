import { supabase } from './supabase.js'

async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    console.log('Error fetching user:', error)
    return null
  }
  return user
}

async function getUserTasks(userId) {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.log('Error fetching tasks:', error)
    return []
  }
  return tasks
}

function computeTaskStats(tasks) {
  const tasksCompleted = tasks.filter(t => t.status === 'completed').length
  const tasksPending = tasks.filter(t => t.status === 'pending').length

  // Aggregate tasks by date for chart (YYYY-MM-DD)
  const tasksOverTimeMap = {}
  tasks.forEach(t => {
    const date = t.created_at.split('T')[0]
    if (!tasksOverTimeMap[date]) tasksOverTimeMap[date] = { completed: 0, pending: 0 }
    if (t.status === 'completed') tasksOverTimeMap[date].completed += 1
    else if (t.status === 'pending') tasksOverTimeMap[date].pending += 1
  })

  const tasksOverTime = Object.entries(tasksOverTimeMap).map(([date, counts]) => ({
    date,
    completed: counts.completed,
    pending: counts.pending
  }))

  return { tasksCompleted, tasksPending, tasksOverTime, totalTasks: tasks.length }
}

async function renderProfile() {
  const user = await getCurrentUser()
  if (!user) {
    console.log('No user logged in')
    return
  }

  const tasks = await getUserTasks(user.id)
  const { tasksCompleted, tasksPending, tasksOverTime, totalTasks } = computeTaskStats(tasks)

  // --- Update profile display ---
  document.getElementById('userName').textContent = user.email // replace with display name if available
  document.getElementById('userEmail').textContent = user.email
  document.getElementById('memberSince').textContent = new Date(user.created_at).toLocaleDateString()
  document.getElementById('tasksCompleted').textContent = tasksCompleted
  document.getElementById('tasksPending').textContent = tasksPending
  document.getElementById('totalTasks').textContent = totalTasks
  document.getElementById('completedTasks').textContent = tasksCompleted
  document.getElementById('pendingTasks').textContent = tasksPending

  // --- Populate account settings form ---
  document.getElementById('fullName').value = user.email // replace with display name if available
  document.getElementById('email').value = user.email

  // --- Render Chart.js ---
  const ctx = document.getElementById('tasksChart')?.getContext('2d')
  if (ctx) {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: tasksOverTime.map(t => t.date),
        datasets: [
          { label: 'Completed', data: tasksOverTime.map(t => t.completed), backgroundColor: 'rgba(40,167,69,0.8)' },
          { label: 'Pending', data: tasksOverTime.map(t => t.pending), backgroundColor: 'rgba(220,53,69,0.8)' }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Tasks Overview' }
        },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true }
        }
      }
    })
  }
}

// Run render on page load
renderProfile()



// Handle account settings form submission
const accountForm = document.getElementById('accountSettingsForm')
accountForm?.addEventListener('submit', async (e) => {
  e.preventDefault()

  const fullName = document.getElementById('fullName').value
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  const user = await getCurrentUser()
  if (!user) return

  // Update email
  if (email && email !== user.email) {
    const { error: emailError } = await supabase.auth.updateUser({ email })
    if (emailError) return alert('Error updating email: ' + emailError.message)
  }

  // Update password
  if (password) {
    const { error: passError } = await supabase.auth.updateUser({ password })
    if (passError) return alert('Error updating password: ' + passError.message)
  }

  // Update full name (metadata)
  if (fullName) {
    const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: fullName } })
    if (metaError) return alert('Error updating name: ' + metaError.message)
  }

  alert('Account updated successfully!')
  // Optionally, re-render profile to reflect changes
  renderProfile()
})

