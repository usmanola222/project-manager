const initProfile = async () => {
  if (!requireAuth()) return;

  const user = getUser();
  if (!user) return;

  // Set sidebar user info
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();

  // Set profile header
  document.getElementById('profileAvatarLarge').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('profileName').textContent = user.name;
  document.getElementById('profileEmail').innerHTML = `<i class="ph ph-envelope"></i> ${user.email}`;

  // Set info grid
  document.getElementById('infoName').textContent = user.name;
  document.getElementById('infoEmail').textContent = user.email;

  await loadProfileData();
};

const loadProfileData = async () => {
  try {
    // Load notifications
    const notifications = await api('/users/notifications');
    const unread = notifications.filter(n => !n.read);
    document.getElementById('statNotifs').textContent = unread.length;

    // Render notifications
    const notifContainer = document.getElementById('profileNotifs');
    if (notifications.length === 0) {
      notifContainer.innerHTML = `
        <div class="empty-profile-section">
          <i class="ph ph-bell-slash"></i>
          <p>No notifications yet</p>
        </div>
      `;
    } else {
      notifContainer.innerHTML = notifications.slice(0, 5).map(n => `
        <div class="profile-notif-item ${!n.read ? 'unread' : ''}">
          <div class="notif-icon-sm">
            <i class="ph ph-${getNotifIcon(n.type)}"></i>
          </div>
          <div class="notif-content">
            <p>${n.message}</p>
            <small>${timeAgo(n.createdAt)}</small>
          </div>
          ${!n.read ? '<span class="unread-dot"></span>' : ''}
        </div>
      `).join('');
    }

    // Load projects
    const projects = await api('/projects');
    document.getElementById('statProjects').textContent = projects.length;

    const projectsContainer = document.getElementById('profileProjects');
    if (projects.length === 0) {
      projectsContainer.innerHTML = `
        <div class="empty-profile-section">
          <i class="ph ph-kanban"></i>
          <p>No projects yet</p>
        </div>
      `;
    } else {
      projectsContainer.innerHTML = projects.slice(0, 4).map(p => `
        <div class="profile-project-item"
          onclick="window.location.href='project.html?id=${p._id}'">
          <div class="profile-project-color" style="background:${p.color}"></div>
          <div class="profile-project-info">
            <p class="profile-project-name">${p.name}</p>
            <p class="profile-project-members">
              <i class="ph ph-users"></i> ${p.members.length} members
            </p>
          </div>
          <i class="ph ph-arrow-right" style="color:var(--text-light)"></i>
        </div>
      `).join('');
    }

    // Set joined date from first project or fallback
    document.getElementById('infoJoined').textContent = new Date().toLocaleDateString('en-NG', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

  } catch (error) {
    console.log(error);
  }
};

const getNotifIcon = (type) => {
  const icons = {
    task_assigned: 'check-square',
    comment_added: 'chat-circle',
    project_invite: 'users',
    task_moved: 'arrows-out-cardinal',
    task_created: 'plus-circle'
  };
  return icons[type] || 'bell';
};

const markAllRead = async () => {
  try {
    await api('/users/notifications/read', 'PUT');
    showToast('All notifications marked as read ✓');
    await loadProfileData();
  } catch (error) {
    showToast('Failed to update', 'error');
  }
};

// Init
initProfile();