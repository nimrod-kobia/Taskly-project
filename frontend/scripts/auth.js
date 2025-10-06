import { supabase } from '../supabase.js';

/* ----- Forgot Password ----- */
const forgotForm = document.getElementById('forgotPasswordForm');
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password.html`,
    });

    if (error) {
      alert('Error sending reset link: ' + error.message);
    } else {
      alert('Password reset link sent! Check your email.');
    }
  });
}

/* ----- Reset Password ----- */
const resetForm = document.getElementById('resetPasswordForm');
if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      alert('Error resetting password: ' + error.message);
    } else {
      alert('Password successfully updated!');
      window.location.href = 'login.html';
    }
  });
}
