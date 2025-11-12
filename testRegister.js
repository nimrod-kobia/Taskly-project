document.addEventListener("DOMContentLoaded", () => {
  console.log("Starting User Registration Test...");

  const testUser = {
    fullName: "Alex Junior",
    email: "alex@test.com",
    password: "Password123"
  };

  const registerForm = document.getElementById("registerForm");
  const fullNameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  fullNameInput.value = testUser.fullName;
  emailInput.value = testUser.email;
  passwordInput.value = testUser.password;

  registerForm.dispatchEvent(new Event("submit", { bubbles: true }));

  setTimeout(() => {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const exists = users.some(u => u.email === testUser.email);

    console.log("Registration Test Result:", exists ? "Passed" : "Failed");
  }, 1000);
});
