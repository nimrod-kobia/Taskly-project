import { supabase } from './supabase.js';

const resetForm = document.getElementById('resetForm');

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://localhost:5500/reset-password.html', // your reset page URL
  });

  if (error) {
    alert('Error: ' + error.message);
  } else {
    alert('Password reset link sent! Check your email.');
  }
});
