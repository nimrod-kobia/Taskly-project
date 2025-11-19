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
 * Theme Toggle Functionality
 */
function initThemeToggle() {
  // Get saved theme or default to light
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Apply theme immediately
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }
  
  updateThemeIcon(savedTheme);

  // Theme toggle button click handler
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      console.log('Switching from', currentTheme, 'to', newTheme);
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      if (newTheme === 'dark') {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      
      updateThemeIcon(newTheme);
    });
  } else {
    console.warn('Theme toggle button not found');
  }
}

/**
 * Update theme toggle icon
 */
function updateThemeIcon(theme) {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const icon = themeToggle.querySelector('i');
    if (icon) {
      if (theme === 'dark') {
        icon.className = 'bi bi-sun-fill';
        themeToggle.title = 'Switch to Light Mode';
      } else {
        icon.className = 'bi bi-moon-fill';
        themeToggle.title = 'Switch to Dark Mode';
      }
    }
  }
}

/**
 * Load notifications from backend
 */
async function loadNotifications() {
  try {
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
    if (!token) return;

    // Get unread count
    const countResponse = await fetch('http://localhost:8000/reminder.php?count=true', {
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
    const response = await fetch('http://localhost:8000/reminder.php', {
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
      <li class="dropdown-item text-center py-4">
        <i class="bi bi-bell-slash fs-1 text-muted d-block mb-2"></i>
        <p class="text-muted mb-0">No notifications</p>
      </li>
    `;
    return;
  }

  notificationList.innerHTML = notifications.map(notification => {
    const typeClass = notification.notification_type === 'overdue' ? 'danger' : 
                      notification.notification_type === 'due_today' ? 'warning' : 
                      'primary';
    const icon = notification.notification_type === 'overdue' ? 'bi-exclamation-triangle-fill' : 
                 notification.notification_type === 'due_today' ? 'bi-clock-fill' : 
                 'bi-calendar-check';
    const bgClass = notification.notification_type === 'overdue' ? 'bg-danger-subtle' : 
                    notification.notification_type === 'due_today' ? 'bg-warning-subtle' : 
                    'bg-primary-subtle';
    
    return `
      <li>
        <a class="dropdown-item notification-item p-3 ${notification.is_read ? 'read' : 'unread'}" 
           href="#" 
           onclick="markNotificationRead(${notification.id}); return false;">
          <div class="d-flex align-items-start gap-3">
            <div class="notification-icon ${bgClass} text-${typeClass} rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" 
                 style="width: 40px; height: 40px;">
              <i class="bi ${icon}"></i>
            </div>
            <div class="flex-grow-1 overflow-hidden">
              <div class="fw-semibold text-dark mb-1">${notification.title}</div>
              <div class="small text-muted mb-1">
                <i class="bi bi-calendar3 me-1"></i>${new Date(notification.due_date).toLocaleDateString()}
                ${notification.priority ? `<span class="badge bg-${notification.priority === 'high' ? 'danger' : notification.priority === 'medium' ? 'warning text-dark' : 'success'} ms-2 px-2 py-1">${notification.priority}</span>` : ''}
              </div>
              <div class="notification-type-badge">
                <span class="badge bg-${typeClass} bg-opacity-10 text-${typeClass} fw-normal">
                  ${notification.notification_type === 'overdue' ? '⚠️ Overdue' : 
                    notification.notification_type === 'due_today' ? '📅 Due Today' : 
                    `📌 ${notification.days_until_due} day(s) left`}
                </span>
              </div>
            </div>
          </div>
        </a>
      </li>
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
    await fetch(`http://localhost:8000/reminder.php?id=${notificationId}`, {
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
    
    // Show auth-required nav items and hide guest-only items
    document.querySelectorAll('.auth-required').forEach(item => {
      item.style.display = 'block';
    });
    document.querySelectorAll('.guest-only').forEach(item => {
      item.style.display = 'none';
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
          await fetch('http://localhost:8000/reminder.php', {
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

    // Hide auth-required nav items and show guest-only items
    document.querySelectorAll('.auth-required').forEach(item => {
      item.style.display = 'none';
    });
    document.querySelectorAll('.guest-only').forEach(item => {
      item.style.display = 'block';
    });
  }
  
  // Initialize theme toggle
  setTimeout(() => {
    initThemeToggle();
  }, 200);
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
