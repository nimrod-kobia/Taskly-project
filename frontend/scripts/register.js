const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!fullName || !email || !password) {
    alert('Please fill in all fields.');
    return;
  }

  const submitBtn = registerForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Registering...';

  try {
    const response = await fetch('http://localhost:8000/auth/register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password })
    });

    const text = await response.text();
    let result = {};
    try {
      result = JSON.parse(text);
    } catch (err) {
      console.error('Server returned non-JSON:', text);
      alert('Server error. Please check backend.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
      return;
    }

    if (response.ok && result.success) {
      alert(result.message || 'Registration successful! Redirecting to login...');
      window.location.href = 'login.html';
    } else {
      alert(result.error || 'Registration failed');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
    }

  } catch (err) {
    console.error('Network/server error:', err);
    alert('Server error. Please try again later.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign Up';
  }
});
