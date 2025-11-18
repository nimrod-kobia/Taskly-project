// ✅ login.js

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const rememberMe = document.getElementById('rememberMe').checked;

  if (!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  try {
    const response = await fetch('http://localhost:8000/auth/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    // Convert to text first for safety
    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch (err) {
      console.error('Server returned non-JSON:', text);
      alert('Server error. Please check backend.');
      return;
    }

    if (response.ok && result.success) {
      // ✅ Save JWT and user info
      if (rememberMe) {
        // Save to localStorage for persistent login
        localStorage.setItem('jwt', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('rememberMe', 'true');
      } else {
        // Save to sessionStorage for session-only login
        sessionStorage.setItem('jwt', result.token);
        sessionStorage.setItem('user', JSON.stringify(result.user));
        localStorage.removeItem('rememberMe');
      }

      alert('Login successful! Redirecting to tasks...');
      window.location.href = 'tasks.html';
    } else {
      alert(result.error || 'Login failed');
    }

  } catch (err) {
    console.error('Network or server error:', err);
    alert('Server error. Please try again later.');
  }
});


// ✅ Auto redirect if already logged in (but skip if you're already on login page)
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');

  // Stop auto-redirect if you’re literally on login.html
  if (window.location.pathname.includes('login.html')) {
    console.log('On login page → skipping auto redirect.');
    return;
  }

  if (token) {
    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) throw new Error('Malformed token');
      
      const payload = JSON.parse(atob(payloadBase64));
      const isExpired = payload.exp * 1000 < Date.now();

      if (!isExpired) {
        console.log('Valid token found → redirecting to tasks.html');
        window.location.replace('tasks.html');
      } else {
        console.warn('Token expired → clearing localStorage');
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
      }
    } catch (e) {
      console.warn('Invalid stored token → clearing it.', e);
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
    }
  }
});
