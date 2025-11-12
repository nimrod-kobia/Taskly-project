// Configuration
const API_URL = 'http://localhost:8000/register.php';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    const registerForm = document.getElementById('registerForm');
    
    if (!registerForm) {
        console.error('Error: registerForm not found in the DOM');
        return;
    }
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Get form elements
            const fullNameInput = document.getElementById('fullName');  // Changed from 'name'
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirmPassword');
            
            if (!fullNameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
                console.error('Error: One or more form inputs not found');
                alert('Form error: Missing input fields. Please refresh the page.');
                return;
            }
            
            // Get values
            const fullName = fullNameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            // Validate inputs
            if (!fullName || !email || !password || !confirmPassword) {
                alert('Please fill in all fields');
                return;
            }
            
            if (fullName.length < 2) {
                alert('Full name must be at least 2 characters long');
                return;
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address');
                return;
            }
            
            // Validate passwords match
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            // Validate password length
            if (password.length < 6) {
                alert('Password must be at least 6 characters long');
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
                throw new Error(`Server error: ${response.status} - ${text}`);
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
                alert('Registration successful! Redirecting to login...');
                window.location.href = 'login.html';
            } else {
                alert(data.message || 'Registration failed. Please try again.');
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            
            if (error.message.includes('Failed to fetch')) {
                alert('Cannot connect to server. Please ensure the backend is running on http://localhost:8000');
            } else if (error.message.includes('NetworkError')) {
                alert('Network error. Please check your internet connection.');
            } else {
                alert('Registration failed: ' + error.message);
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
