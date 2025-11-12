document.addEventListener("DOMContentLoaded", () => {
  console.log("Starting Task Creation Test...");

  const testTask = {
    title: "Complete Homework",
    description: "Finish math homework",
    deadline: "2025-11-20",
    status: "todo",
    urgency: "high",
    effort: 2
  };

  const taskForm = document.getElementById("taskForm");
  document.getElementById("title").value = testTask.title;
  document.getElementById("description").value = testTask.description;
  document.getElementById("deadline").value = testTask.deadline;
  document.getElementById("status").value = testTask.status;
  document.getElementById("urgency").value = testTask.urgency;
  document.getElementById("effort").value = testTask.effort;

  taskForm.dispatchEvent(new Event("submit", { bubbles: true }));

  setTimeout(() => {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const exists = tasks.some(t => t.title === testTask.title);
    console.log("Task Creation Test Result:", exists ? "Passed" : "Failed");
  }, 1000);
});

