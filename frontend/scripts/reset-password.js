import { supabase } from './supabase.js';

const form = document.getElementById('newPasswordForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById('password').value.trim();

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    alert('Error: ' + error.message);
  } else {
    alert('Password updated successfully!');
    window.location.href = 'login.html';
  }
});
