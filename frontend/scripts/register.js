import { supabase } from './supabase.js';
import { setupNavbarAuth } from './main.js';

const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });

  if (error) {
    alert('Signup failed: ' + error.message);
  } else {
    alert('Signup successful! Please check your email to verify your account.');

    // Automatically update navbar auth buttons
    await setupNavbarAuth();

    // Optionally redirect after a delay
    setTimeout(() => {
      window.location.href = 'tasks.html';
    }, 1000);
  }
});
