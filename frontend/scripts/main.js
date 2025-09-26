import { supabase } from './supabase.js';

/**
 * Get current logged-in user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) console.error('Error fetching user:', error);
  return user || null;
}

/**
 * Setup dynamic navbar buttons
 */
export async function setupNavbarAuth() {
  const authButtons = document.getElementById('auth-buttons');
  if (!authButtons) return;

  const user = await getCurrentUser();

  if (user) {
    // Logged in → show logout
    authButtons.innerHTML = `
      <button class="btn btn-danger" id="logoutBtn">Logout</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      const { error } = await supabase.auth.signOut();
      if (error) alert('Logout failed: ' + error.message);
      else window.location.href = 'login.html';
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
 * Listen to auth state changes and update navbar automatically
 */
function listenToAuthChanges() {
  supabase.auth.onAuthStateChange((_event, session) => {
    setupNavbarAuth();
  });
}

/**
 * Load navbar and initialize auth buttons
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('components/navbar.html');
    const html = await response.text();
    document.getElementById('navbar-placeholder').innerHTML = html;

    await setupNavbarAuth();  // Check login state immediately
    listenToAuthChanges();    // Listen for future login/logout
  } catch (err) {
    console.error('Navbar load error:', err);
  }
});
