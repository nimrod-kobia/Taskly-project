// profile.js
document.addEventListener('DOMContentLoaded', async () => {
  const tasksCompletedEl = document.getElementById('tasksCompleted');
  const tasksPendingEl = document.getElementById('tasksPending');
  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  const memberSinceEl = document.getElementById('memberSince');

  // ===== JWT Helpers =====
  const getToken = () => localStorage.getItem('jwt') || sessionStorage.getItem('jwt');

  const getCurrentUser = () => {
    const token = getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        logout();
        return null;
      }
      return payload;
    } catch (err) {
      console.error('Invalid token', err);
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    window.location.replace('login.html');
  };

  // ===== Fetch Tasks =====
  const fetchAndRenderTasks = async () => {
    try {
      const res = await fetch('http://localhost:8000/tasks/get_tasks.php', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server error response:', errorText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Tasks response:', data);
      
      // Handle null, undefined, or missing tasks
      if (!data.success || !data.tasks) {
        console.warn('No tasks data received');
        return;
      }
      
      const tasks = Array.isArray(data.tasks) ? data.tasks : [];

      // Calculate statistics
      const completed = tasks.filter(t => t.status?.toLowerCase() === 'completed' || t.status?.toLowerCase() === 'done').length;
      const inProgress = tasks.filter(t => t.status?.toLowerCase() === 'in_progress' || t.status?.toLowerCase() === 'in progress').length;
      const pending = tasks.filter(t => !t.status || t.status?.toLowerCase() === 'pending' || t.status?.toLowerCase() === 'to do').length;
      const highPriority = tasks.filter(t => t.priority?.toLowerCase() === 'high').length;

      // Update existing stats
      if (tasksCompletedEl) tasksCompletedEl.textContent = completed;
      if (tasksPendingEl) tasksPendingEl.textContent = pending;

      // Update new stat cards
      const statsCompleted = document.getElementById('statsCompleted');
      const statsInProgress = document.getElementById('statsInProgress');
      const statsPending = document.getElementById('statsPending');
      const statsHighPriority = document.getElementById('statsHighPriority');

      if (statsCompleted) statsCompleted.textContent = completed;
      if (statsInProgress) statsInProgress.textContent = inProgress;
      if (statsPending) statsPending.textContent = pending;
      if (statsHighPriority) statsHighPriority.textContent = highPriority;

    } catch (err) {
      console.error('Error fetching tasks for profile:', err);
      // Set default values on error
      if (tasksCompletedEl) tasksCompletedEl.textContent = '0';
      if (tasksPendingEl) tasksPendingEl.textContent = '0';
    }
  };

  // ===== Fetch Profile Info =====
  const renderProfileInfo = async () => {
  const token = getToken();
  if (!token) {
    userNameEl.textContent = 'Unknown';
    userEmailEl.textContent = 'Unknown';
    memberSinceEl.textContent = 'Unknown';
    return;
  }

  try {
    const res = await fetch('http://localhost:8000/Users/get_user.php', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Fetch /get_user.php status:', res.status);

    const data = await res.json();
    console.log('User data:', data);

    const user = data.user || {};

    userNameEl.textContent = user.name || 'Unknown';
    userEmailEl.textContent = user.email || 'Unknown';
    memberSinceEl.textContent = user.registered_at
      ? new Date(user.registered_at).toLocaleDateString()
      : 'Unknown';

    document.getElementById('fullName').value = user.name || '';
    document.getElementById('email').value = user.email || '';

  } catch (err) {
    console.error('Error fetching user info:', err);
    userNameEl.textContent = 'Unknown';
    userEmailEl.textContent = 'Unknown';
    memberSinceEl.textContent = 'Unknown';
  }
};

  // ===== Global refresh =====
  window.profileRefresh = async () => {
    await renderProfileInfo();
    await fetchAndRenderTasks();
  };

  // ===== Toast Notification Helper =====
  const showNotification = (title, message, type = 'info') => {
    const container = document.getElementById('toastContainer');
    if (!container) {
      // Create container if it doesn't exist
      const newContainer = document.createElement('div');
      newContainer.id = 'toastContainer';
      newContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(newContainer);
      return showNotification(title, message, type);
    }

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
  };

  // ===== Account Settings Form =====
  document.getElementById('accountSettingsForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      const body = {};
      if (fullName) body.fullName = fullName;
      if (email) body.email = email;
      if (password) body.password = password;

      if (Object.keys(body).length === 0) {
        showNotification('Validation Error', 'No changes to save', 'warning');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }

      console.log('Updating profile with data:', body);
      
      const res = await fetch('http://localhost:8000/user.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(body)
      });
      
      console.log('Response status:', res.status);
      
      // Get response text first to handle non-JSON responses
      const text = await res.text();
      console.log('Response text:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse response as JSON:', text);
        showNotification('Error', 'Server returned invalid response. Check console for details.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
      
      if (res.ok && data.success) {
        showNotification('Success', 'Account updated successfully!', 'success');
        // Clear password field after successful update
        document.getElementById('password').value = '';
        window.profileRefresh();
      } else {
        const errorMsg = data.error || data.message || 'Failed to update account.';
        console.error('Update failed:', errorMsg, data);
        showNotification('Error', errorMsg, 'error');
      }
    } catch (err) {
      console.error('Error updating account:', err);
      showNotification('Error', 'Server error while updating account: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // ===== Profile Photo Upload =====
  const changePhotoBtn = document.getElementById('changePhotoBtn');
  const removePhotoBtn = document.getElementById('removePhotoBtn');
  const photoInput = document.getElementById('photoInput');
  const profilePicture = document.getElementById('profilePicture');

  // Trigger file input when change photo button is clicked
  changePhotoBtn?.addEventListener('click', () => {
    photoInput.click();
  });

  // Handle file selection
  photoInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should not exceed 5MB.');
      return;
    }

    // Read and display the image
    const reader = new FileReader();
    reader.onload = (event) => {
      profilePicture.src = event.target.result;
      
      // Store in localStorage for persistence
      localStorage.setItem('profilePhoto', event.target.result);
      
      // Show remove button
      removePhotoBtn.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  });

  // Handle photo removal
  removePhotoBtn?.addEventListener('click', () => {
    profilePicture.src = 'Assets/profile-holder.png';
    localStorage.removeItem('profilePhoto');
    removePhotoBtn.style.display = 'none';
    photoInput.value = '';
  });

  // Load saved profile photo on page load
  const savedPhoto = localStorage.getItem('profilePhoto');
  if (savedPhoto) {
    profilePicture.src = savedPhoto;
    removePhotoBtn.style.display = 'inline-block';
  }

  // ===== Initial load & auto-refresh every 5s =====
  window.profileRefresh();
  setInterval(window.profileRefresh, 5000);

});
