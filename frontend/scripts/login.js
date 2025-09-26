import { supabase } from './supabase.js';
import { setupNavbarAuth } from './main.js';

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert('Login failed: ' + error.message);
  } else {
    alert('Login successful!');

    // Automatically update navbar auth buttons
    await setupNavbarAuth();

    // Redirect to tasks page
    window.location.href = 'tasks.html';
  }
});
