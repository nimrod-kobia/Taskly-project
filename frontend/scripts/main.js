/**
 * Get current logged-in user from localStorage or sessionStorage
 */
export function getCurrentUser() {
  try {
    // Check localStorage first (remember me)
    let user = localStorage.getItem('user');
    if (user) return JSON.parse(user);
    
    // Check sessionStorage (no remember me)
    user = sessionStorage.getItem('user');
    if (user) return JSON.parse(user);
    
    return null;
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
      // Clear token and user from both storages
      localStorage.removeItem('jwt');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('jwt');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
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

    // Use setTimeout to ensure DOM elements are ready
    setTimeout(() => {
      setupNavbarAuth();  // Check login state after DOM is ready
    }, 100);
  } catch (err) {
    console.error('Navbar load error:', err);
  }
});
