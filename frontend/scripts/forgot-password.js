import { supabase } from './supabase.js';

console.log('forgot-password.js loaded');

const form = document.getElementById('resetForm');
if (!form) {
  console.error('⚠️ resetForm not found in DOM!');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log('Form submitted');

  const email = document.getElementById('email').value.trim();
  console.log('Email entered:', email);

  if (!email) {
    alert('Please enter your email.');
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Sending...';

  try {
    const redirectUrl = `http://127.0.0.1:5501/frontend/reset-password.html`;
    console.log('Using redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    console.log('Supabase response:', { data, error });

    if (error) {
      alert('❌ Error: ' + error.message);
    } else {
      alert('✅ Check your inbox for the reset link!');
      form.reset();
    }
  } catch (err) {
    console.error('Unexpected JS error:', err);
    alert('Something went wrong: ' + err.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Send Reset Link';
  }
});
