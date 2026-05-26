// ===== AUTH HELPERS =====
const getToken = () => localStorage.getItem('token');
const getUser = () => JSON.parse(localStorage.getItem('user'));

const requireAuth = () => {
  if (!getToken()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
};

const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
};

// ===== API HELPER =====
const api = async (endpoint, method = 'GET', body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`/api${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
};

// ===== TOAST =====
const showToast = (message, type = 'success') => {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <i class="ph ph-${type === 'success' ? 'check-circle' : 'warning-circle'}"></i>
    ${message}
  `;
  if (type === 'error') toast.style.background = '#dc2626';
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// ===== ALERT =====
const showAlert = (id, message, type) => {
  const box = document.getElementById(id);
  if (!box) return;
  box.textContent = message;
  box.className = `alert alert-${type}`;
  setTimeout(() => box.className = 'alert', 4000);
};

// ===== GREETING =====
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// ===== TIME AGO =====
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

// ===== REAL TIME NOTIFICATIONS =====
const initSocketNotifications = (socket) => {
  socket.on('notification', (data) => {
    showToast(data.message);
    updateNotifBadge();
  });
};

const updateNotifBadge = async () => {
  try {
    const notifications = await api('/users/notifications');
    const unread = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notifCount');
    const dot = document.getElementById('notifDot');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }
    if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
  } catch (error) {
    console.log(error);
  }
};

// ===== CLOSE MODALS ON OUTSIDE CLICK =====
window.addEventListener('click', (e) => {
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(modal => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Close notifications dropdown
  const dropdown = document.getElementById('notifDropdown');
  const notifBtn = document.getElementById('notifBtn');
  if (dropdown && notifBtn &&
    !dropdown.contains(e.target) &&
    !notifBtn.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

// ===== CLOSE ON ESCAPE KEY =====
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.style.display = 'none';
    });
  }
});