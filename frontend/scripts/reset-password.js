import { supabase } from './supabase.js';

console.log('Reset password page loaded');

const form = document.getElementById('newPasswordForm');
const passwordInput = document.getElementById('password');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newPassword = passwordInput.value.trim();
  if (!newPassword) {
    showAlert('Please enter a new password.', 'danger');
    return;
  }

  // Try updating the password
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    console.error('Error updating password:', error.message);
    showAlert('❌ ' + error.message, 'danger');
  } else {
    showAlert('✅ Password updated successfully! Redirecting to login...', 'success');
    form.reset();

    // Redirect after a short delay
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  }
});

// Helper to show notifications
function showAlert(message, type = 'info') {
  const existing = document.querySelector('.alert');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.className = `alert alert-${type} mt-3 text-center`;
  div.textContent = message;
  form.parentNode.insertBefore(div, form.nextSibling);

  setTimeout(() => div.remove(), 4000);
}
