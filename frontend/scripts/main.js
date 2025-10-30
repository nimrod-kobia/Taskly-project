/**
 * Get current logged-in user from localStorage
 */
export function getCurrentUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user || null;
  } catch (err) {
    console.error('Error fetching user:', err);
    return null;
  }
}

/**
 * Setup dynamic navbar buttons
 */
export function setupNavbarAuth() {
  const authButtons = document.getElementById('auth-buttons');
  if (!authButtons) return;

  const user = getCurrentUser();

  if (user) {
    // Logged in → show logout
    authButtons.innerHTML = `
      <button class="btn btn-danger" id="logoutBtn">Logout</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => {
      // Clear token and user from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    });
  } else {
    // Not logged in → show login/signup
    authButtons.innerHTML = `
      <a class="btn btn-outline-primary me-2" href="login.html">Log In</a>
      <a class="btn btn-primary" href="register.html">Sign Up</a>
    `;
  }
}

/**
 * Load navbar and initialize auth buttons
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('components/navbar.html');
    const html = await response.text();
    document.getElementById('navbar-placeholder').innerHTML = html;

    setupNavbarAuth();  // Check login state immediately
  } catch (err) {
    console.error('Navbar load error:', err);
  }
});
