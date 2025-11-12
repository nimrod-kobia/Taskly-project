document.addEventListener("DOMContentLoaded", () => {
  console.log("Starting User Registration Test...");

  const testUser = {
    full_name: "Nimrod Kobia", 
    email: "nimrodkobia066@gmail.com",
    password: "Exroyalty1!"
  };

  const registerForm = document.getElementById("registerForm");
  const fullNameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (fullNameInput) fullNameInput.value = testUser.full_name;
  if (emailInput) emailInput.value = testUser.email;
  if (passwordInput) passwordInput.value = testUser.password;

  registerForm.dispatchEvent(new Event("submit", { bubbles: true }));

  setTimeout(() => {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const exists = users.some(u => u.email === testUser.email);

    console.log("Registration Test Result:", exists ? "Passed" : "Failed");
  }, 1000);
});
