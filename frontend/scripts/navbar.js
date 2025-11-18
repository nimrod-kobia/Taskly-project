/**
 * Get current logged-in user from localStorage or sessionStorage
 */
export function getCurrentUser() {
  // Check localStorage first (remember me)
  let user = localStorage.getItem('user');
  if (user) return JSON.parse(user);
  
  // Check sessionStorage (no remember me)
  user = sessionStorage.getItem('user');
  if (user) return JSON.parse(user);
  
  return null;
}

/**
 * Load notifications from backend
 */
async function loadNotifications() {
  try {
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
    if (!token) return;

    // Get unread count
    const countResponse = await fetch('http://localhost:8000/tasks/notifications.php?count=true', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const countData = await countResponse.json();
    
    if (countData.success) {
      const badge = document.getElementById('notification-badge');
      if (badge) {
        if (countData.count > 0) {
          badge.textContent = countData.count;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }
    }

    // Get recent notifications
    const response = await fetch('http://localhost:8000/tasks/notifications.php?limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.notifications) {
      renderNotifications(data.notifications);
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

/**
 * Render notifications in dropdown
 */
function renderNotifications(notifications) {
  const notificationList = document.getElementById('notification-list');
  if (!notificationList) return;
  
  if (!notifications || notifications.length === 0) {
    notificationList.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-bell-slash fs-1"></i>
        <p class="mt-2">No notifications</p>
      </div>
    `;
    return;
  }

  notificationList.innerHTML = notifications.map(notification => {
    const isUnread = !notification.is_read;
    const timeAgo = getTimeAgo(notification.created_at);
    const typeIcon = notification.type === 'due_soon' ? 'clock' : 
                    notification.type === 'overdue' ? 'exclamation-triangle' : 
                    'check-circle';
    const typeColor = notification.type === 'overdue' ? 'text-danger' : 
                     notification.type === 'due_soon' ? 'text-warning' : 
                     'text-success';
    
    return `
      <div class="notification-item p-3 border-bottom ${isUnread ? 'bg-light' : ''}" 
           onclick="window.markNotificationRead(${notification.id})" 
           style="cursor: pointer;">
        <div class="d-flex">
          <i class="bi bi-${typeIcon} ${typeColor} fs-5 me-3"></i>
          <div class="flex-grow-1">
            <h6 class="mb-1 ${isUnread ? 'fw-bold' : ''}">${notification.title}</h6>
            <p class="mb-1 text-muted small">${notification.message}</p>
            <small class="text-muted">${timeAgo}</small>
          </div>
          ${isUnread ? '<span class="badge bg-primary">New</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Helper function to format time
 */
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
}

/**
 * Mark notification as read
 */
async function markNotificationRead(notificationId) {
  try {
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
    await fetch(`http://localhost:8000/tasks/notifications.php?id=${notificationId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    loadNotifications();
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

// Make markNotificationRead available globally for onclick
window.markNotificationRead = markNotificationRead;

/**
 * Setup dynamic navbar buttons and notifications
 */
export function setupNavbarAuth() {
  const authButtons = document.getElementById('auth-buttons');
  const notificationDropdown = document.getElementById('notification-dropdown');
  if (!authButtons) return;

  const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
  const user = getCurrentUser();

  if (token && user) {
    // Logged in → show logout and notification bell
    authButtons.innerHTML = `
      <button class="btn btn-outline-danger" id="logoutBtn">Log Out</button>
    `;
    
    if (notificationDropdown) {
      notificationDropdown.style.display = 'block';
      
      // Load notifications immediately
      loadNotifications();
      
      // Poll for new notifications every 30 seconds
      setInterval(loadNotifications, 30000);
    }
    
    // Show auth-required nav items
    document.querySelectorAll('.auth-required').forEach(item => {
      item.style.display = 'block';
    });
    
    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('jwt');
      sessionStorage.removeItem('user');
      window.location.href = 'index.html';
    });
    
    // Mark all as read button
    const markAllBtn = document.getElementById('mark-all-read');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
          await fetch('http://localhost:8000/tasks/notifications.php', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mark_all_read: true })
          });
          
          loadNotifications();
        } catch (error) {
          console.error('Error marking all as read:', error);
        }
      });
    }
  } else {
    // Not logged in → show login/signup and hide bell
    authButtons.innerHTML = `
      <a class="btn btn-outline-primary me-2" href="login.html">Log In</a>
      <a class="btn btn-primary" href="register.html">Sign Up</a>
    `;
    
    if (notificationDropdown) {
      notificationDropdown.style.display = 'none';
    }

    // Hide auth-required nav items
    document.querySelectorAll('.auth-required').forEach(item => {
      item.style.display = 'none';
    });
  }
}

/**
 * Load navbar and initialize auth buttons
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('components/navbar.html');
    const html = await response.text();
    document.getElementById('navbar-placeholder').innerHTML = html;

    // Use setTimeout to ensure DOM elements are ready
    setTimeout(() => {
      setupNavbarAuth();  // Check login state after DOM is ready
    }, 100);
  } catch (err) {
    console.error('Navbar load error:', err);
  }
});
