document.addEventListener("DOMContentLoaded", () => {
  console.log("Starting Login Test...");

  const testUser = {
    email: "alex@test.com",
    password: "Password123"
  };

  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  emailInput.value = testUser.email;
  passwordInput.value = testUser.password;

  loginForm.dispatchEvent(new Event("submit", { bubbles: true }));

  setTimeout(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("user"));
    console.log(
      "Login Test Result:",
      loggedInUser && loggedInUser.email === testUser.email ? "Passed" : "Failed"
    );
  }, 1000);
});

