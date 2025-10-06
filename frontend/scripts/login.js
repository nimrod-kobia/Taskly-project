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
  

const loginForm = document.querySelector('#loginForm');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.querySelector('#email').value;
  const password = document.querySelector('#password').value;

  const response = await fetch('http://localhost/Taskly-project/Backend/auth.php?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include' // important for sessions
  });

  const data = await response.json();

  if (response.ok) {
    alert('Login successful!');
    window.location.href = '/dashboard.html';
  } else {
    alert(data.error || 'Login failed');
  }
});

});
