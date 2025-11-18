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
      const data = await res.json();
      const tasks = Array.isArray(data.tasks) ? data.tasks : Object.values(data.tasks);

      // Calculate statistics
      const completed = tasks.filter(t => t.status?.toLowerCase() === 'done').length;
      const inProgress = tasks.filter(t => t.status?.toLowerCase() === 'in progress').length;
      const pending = tasks.filter(t => !t.status || t.status?.toLowerCase() === 'pending' || t.status?.toLowerCase() === 'to do').length;
      const highPriority = tasks.filter(t => t.priority?.toLowerCase() === 'high').length;

      // Update existing stats
      tasksCompletedEl.textContent = completed;
      tasksPendingEl.textContent = pending;

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

  // ===== Account Settings Form =====
  document.getElementById('accountSettingsForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/Backend/user/update_user.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ fullName, email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Account updated successfully!');
        window.profileRefresh();
      } else {
        alert(data.error || 'Failed to update account.');
      }
    } catch (err) {
      console.error('Error updating account:', err);
      alert('Server error while updating account.');
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
