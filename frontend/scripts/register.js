// Configuration
const API_URL = 'http://localhost:8000/register.php';

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

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    const registerForm = document.getElementById('registerForm');
    const registerError = document.getElementById('registerError');
    const registerErrorMsg = document.getElementById('registerErrorMsg');
    const registerBtn = document.getElementById('registerBtn');
    
    if (!registerForm) {
        console.error('Error: registerForm not found in the DOM');
        return;
    }

    // Helper to show error
    const showError = (message) => {
        registerErrorMsg.textContent = message;
        registerError.style.display = 'block';
        if (registerBtn) {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Sign Up';
        }
    };

    // Helper to hide error
    const hideError = () => {
        registerError.style.display = 'none';
    };
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();
        
        try {
            // Get form elements
            const fullNameInput = document.getElementById('fullName');  // Changed from 'name'
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirmPassword');
            
            if (!fullNameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
                console.error('Error: One or more form inputs not found');
                showNotification('Form Error', 'Missing input fields. Please refresh the page.', 'error');
                return;
            }
            
            // Get values
            const fullName = fullNameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            // Validate inputs
            if (!fullName || !email || !password || !confirmPassword) {
                showError('Please fill in all fields');
                showNotification('Validation Error', 'Please fill in all fields', 'warning');
                return;
            }
            
            if (fullName.length < 2) {
                showError('Full name must be at least 2 characters long');
                showNotification('Validation Error', 'Full name must be at least 2 characters long', 'warning');
                return;
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('Please enter a valid email address');
                showNotification('Validation Error', 'Please enter a valid email address', 'warning');
                return;
            }
            
            // Validate passwords match
            if (password !== confirmPassword) {
                showError('Passwords do not match!');
                showNotification('Validation Error', 'Passwords do not match!', 'warning');
                return;
            }
            
            // Validate password length
            if (password.length < 6) {
                showError('Password must be at least 6 characters long');
                showNotification('Validation Error', 'Password must be at least 6 characters long', 'warning');
                return;
            }
            
            // Disable submit button
            const submitButton = registerForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Registering...';
            }
            
            // Make API request - use full_name instead of name
            console.log('Sending registration request to:', API_URL);
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    full_name: fullName,  // Changed from 'name' to 'full_name'
                    email, 
                    password 
                })
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const text = await response.text();
                console.error('Server error response:', text);
                let errorMsg = 'Server error occurred';
                try {
                    const errorData = JSON.parse(text);
                    errorMsg = errorData.message || errorData.error || errorMsg;
                } catch (e) {
                    errorMsg = text || errorMsg;
                }
                showError(errorMsg);
                throw new Error(errorMsg);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Server returned non-JSON:', text);
                throw new Error('Server returned invalid response format');
            }
            
            const data = await response.json();
            console.log('Server response:', data);
            
            if (data.success) {
                hideError();
                showNotification('Success!', 'Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                const errorMsg = data.message || data.error || 'Registration failed. Please try again.';
                showError(errorMsg);
                showNotification('Registration Failed', errorMsg, 'error');
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            
            if (error.message.includes('Failed to fetch')) {
                showError('Cannot connect to server. Please ensure the backend is running.');
                showNotification('Connection Error', 'Cannot connect to server. Please ensure the backend is running on http://localhost:8000', 'error');
            } else if (error.message.includes('NetworkError')) {
                showError('Network error. Please check your internet connection.');
                showNotification('Network Error', 'Please check your internet connection.', 'error');
            } else {
                showError(error.message);
                showNotification('Registration Failed', error.message, 'error');
            }
        } finally {
            // Re-enable submit button
            const submitButton = registerForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Sign Up';
            }
        }
    });
    
    console.log('Register.js loaded successfully');
});
