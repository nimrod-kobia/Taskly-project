const userData = {
  name: "John Doe",
  email: "john.doe@example.com",
  memberSince: "January 2025",
  tasksCompleted: 42,
  tasksPending: 8,
  tasksOverTime: [
    { date: "2025-08-20", completed: 2, pending: 1 },
    { date: "2025-08-21", completed: 3, pending: 0 },
    { date: "2025-08-22", completed: 1, pending: 2 },
  ]
};

document.getElementById('userName').textContent = userData.name;
document.getElementById('userEmail').textContent = userData.email;
document.getElementById('memberSince').textContent = userData.memberSince;
document.getElementById('tasksCompleted').textContent = userData.tasksCompleted;
document.getElementById('tasksPending').textContent = userData.tasksPending;

const totalTasks = userData.tasksOverTime.reduce((sum,t)=>sum+t.completed+t.pending,0);
const totalCompleted = userData.tasksOverTime.reduce((sum,t)=>sum+t.completed,0);
const totalPending = userData.tasksOverTime.reduce((sum,t)=>sum+t.pending,0);

document.getElementById('totalTasks').textContent = totalTasks;
document.getElementById('completedTasks').textContent = totalCompleted;
document.getElementById('pendingTasks').textContent = totalPending;

// Chart.js
const ctx = document.getElementById('tasksChart')?.getContext('2d');
if(ctx){
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: userData.tasksOverTime.map(t=>t.date),
      datasets:[
        { label:'Completed', data:userData.tasksOverTime.map(t=>t.completed), backgroundColor:'rgba(40,167,69,0.8)' },
        { label:'Pending', data:userData.tasksOverTime.map(t=>t.pending), backgroundColor:'rgba(220,53,69,0.8)' }
      ]
    },
    options:{ responsive:true, plugins:{ legend:{ position:'top' }, title:{ display:true, text:'Tasks Overview (Past 30 Days)' } }, scales:{ x:{ stacked:true }, y:{ stacked:true, beginAtZero:true } } }
  });
}
