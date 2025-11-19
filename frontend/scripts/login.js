// ✅ login.js

// Toast notification helper
function showNotification(title, message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const bgClass = type === 'success' ? 'bg-success' : 
                  type === 'error' ? 'bg-danger' : 
                  type === 'warning' ? 'bg-warning' : 'bg-primary';

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-white ${bgClass} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');
  
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong>${title}</strong><br>${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
  toast.show();
  
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loginErrorMsg = document.getElementById('loginErrorMsg');
  const loginBtn = document.getElementById('loginBtn');
  
  if (!loginForm) {
    console.error('Login form not found');
    return;
  }

  // Helper to show error
  const showError = (message) => {
    loginErrorMsg.textContent = message;
    loginError.style.display = 'block';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log In';
  };

  // Helper to hide error
  const hideError = () => {
    loginError.style.display = 'none';
  };

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;

  if (!email || !password) {
    showError('Please enter both email and password.');
    showNotification('Validation Error', 'Please enter both email and password.', 'warning');
    return;
  }

  // Disable button and show loading
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  try {
    const response = await fetch('http://localhost:8000/login.php', {
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
      showError('Server error. Please check backend.');
      showNotification('Server Error', 'Please check backend.', 'error');
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

      // Automatically redirect without alert
      window.location.href = 'tasks.html';
    } else {
      // Show specific error message
      const errorMessage = result.error || result.message || 'Invalid email or password';
      showError(errorMessage);
      showNotification('Login Failed', errorMessage, 'error');
    }

  } catch (err) {
    console.error('Network or server error:', err);
    showError('Network error. Please try again later.');
    showNotification('Network Error', 'Server error. Please try again later.', 'error');
  }
  });

  // ✅ Auto redirect if already logged in (but skip if you're already on login page)
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
