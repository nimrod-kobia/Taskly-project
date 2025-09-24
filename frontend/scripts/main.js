document.addEventListener("DOMContentLoaded", () => {
  // Load the navbar HTML
  fetch("components/navbar.html")
    .then(response => response.text())
    .then(html => {
      document.getElementById("navbar-placeholder").innerHTML = html;

      // After navbar loads, run auth logic
      setupNavbarAuth();
    })
    .catch(err => console.error("Navbar load error:", err));
});

function setupNavbarAuth() {
  const authButtons = document.getElementById("auth-buttons");

  if (!authButtons) return; // Prevent errors if element missing

  // Example login state (replace with real Supabase/session check)
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";

  if (isLoggedIn) {
    // Replace login/signup with logout button
    authButtons.innerHTML = `
      <button class="btn btn-danger" id="logoutBtn">Logout</button>
    `;

    // Logout functionality
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("loggedIn");
      window.location.href = "login.html";
    });
  }
}
