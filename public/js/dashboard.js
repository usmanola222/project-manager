let selectedColor = '#e94560';
let allProjects = [];

// ===== INIT =====
const initDashboard = async () => {
  if (!requireAuth()) return;

  const user = getUser();
  if (user) {
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('greetingText').textContent =
      `${getGreeting()}, ${user.name.split(' ')[0]}! 👋`;
  }

  await loadProjects();
  await loadNotifications();
};

// ===== LOAD PROJECTS =====
const loadProjects = async () => {
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = '<p class="loading-text">Loading projects...</p>';

  try {
    allProjects = await api('/projects');

    // Update stats
    document.getElementById('statProjects').textContent = allProjects.length;

    const totalMembers = new Set(
      allProjects.flatMap(p => p.members.map(m => m.user._id))
    ).size;
    document.getElementById('statMembers').textContent = totalMembers;

    const done = allProjects.filter(p => p.name.toLowerCase().includes('done')).length;
    document.getElementById('statDone').textContent = done;

    if (allProjects.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <i class="ph ph-kanban"></i>
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button class="btn-auth"
            style="width:auto;padding:0.7rem 1.5rem;margin:0 auto"
            onclick="openProjectModal()">
            <i class="ph ph-plus"></i> New Project
          </button>
        </div>
      `;
      return;
    }

    renderProjects(allProjects);

  } catch (error) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="ph ph-warning"></i>
        <h3>Failed to load projects</h3>
        <p>${error.message}</p>
        <button class="btn-auth"
          style="width:auto;padding:0.7rem 1.5rem;margin:0 auto"
          onclick="loadProjects()">
          Try Again
        </button>
      </div>
    `;
  }
};

// ===== RENDER PROJECTS =====
const renderProjects = (projects) => {
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = projects.map(project => `
    <div class="project-card"
      onclick="window.location.href='project.html?id=${project._id}'">
      <div class="project-color-bar" style="background:${project.color}"></div>
      <div class="project-card-top">
        <div class="project-icon"
          style="background:${project.color}20;color:${project.color}">
          <i class="ph ph-kanban"></i>
        </div>
        <button class="project-menu-btn"
          onclick="event.stopPropagation(); confirmDeleteProject('${project._id}', '${project.name}')">
          <i class="ph ph-trash"></i>
        </button>
      </div>
      <p class="project-name">${project.name}</p>
      <p class="project-desc">${project.description || 'No description added'}</p>
      <div class="project-footer">
        <div class="project-members">
          ${project.members.slice(0, 3).map(m => `
            <div class="member-avatar" style="background:${project.color}">
              ${m.user.name.charAt(0).toUpperCase()}
            </div>
          `).join('')}
          ${project.members.length > 3
            ? `<div class="member-avatar">+${project.members.length - 3}</div>`
            : ''}
        </div>
        <span class="project-task-count">
          <i class="ph ph-users"></i>
          ${project.members.length} member${project.members.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  `).join('');
};

// ===== CREATE PROJECT =====
const createProject = async () => {
  const name = document.getElementById('projectName').value.trim();
  const description = document.getElementById('projectDesc').value.trim();
  const btn = document.querySelector('#projectModal .btn-auth');

  if (!name) {
    showAlert('modalAlert', 'Project name is required', 'error');
    return;
  }

  btn.innerHTML = '<span>Creating...</span>';
  btn.disabled = true;

  try {
    await api('/projects', 'POST', {
      name,
      description,
      color: selectedColor
    });
    closeProjectModal();
    showToast('Project created! ✓');
    await loadProjects();
  } catch (error) {
    showAlert('modalAlert', error.message, 'error');
  } finally {
    btn.innerHTML = '<i class="ph ph-plus"></i><span>Create Project</span>';
    btn.disabled = false;
  }
};

// ===== DELETE PROJECT =====
const confirmDeleteProject = (id, name) => {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  deleteProject(id);
};

const deleteProject = async (id) => {
  try {
    await api(`/projects/${id}`, 'DELETE');
    showToast('Project deleted');
    await loadProjects();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

// ===== PROJECT MODAL =====
const openProjectModal = () => {
  document.getElementById('projectModal').style.display = 'flex';
  document.getElementById('projectName').focus();
};

const closeProjectModal = () => {
  document.getElementById('projectModal').style.display = 'none';
  document.getElementById('projectName').value = '';
  document.getElementById('projectDesc').value = '';
};

// ===== COLOR PICKER =====
const selectColor = (el) => {
  document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  selectedColor = el.dataset.color;
};

// ===== NOTIFICATIONS =====
const loadNotifications = async () => {
  try {
    const notifications = await api('/users/notifications');
    const unread = notifications.filter(n => !n.read);

    const badge = document.getElementById('notifCount');
    const dot = document.getElementById('notifDot');

    badge.textContent = unread.length;
    badge.style.display = unread.length > 0 ? 'flex' : 'none';
    if (dot) dot.style.display = unread.length > 0 ? 'block' : 'none';

    const list = document.getElementById('notifList');
    if (notifications.length === 0) {
      list.innerHTML = '<p class="notif-empty">No notifications yet</p>';
      return;
    }

    list.innerHTML = notifications.map(n => `
      <div class="notif-item ${!n.read ? 'unread' : ''}">
        <div class="notif-icon">
          <i class="ph ph-${getNotifIcon(n.type)}"></i>
        </div>
        <div class="notif-content">
          <p>${n.message}</p>
          <small>${timeAgo(n.createdAt)}</small>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.log('Notifications error:', error);
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

const toggleNotifications = () => {
  const dropdown = document.getElementById('notifDropdown');
  const isVisible = dropdown.style.display === 'block';
  dropdown.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) loadNotifications();
};

const markAllRead = async () => {
  try {
    await api('/users/notifications/read', 'PUT');
    showToast('All notifications marked as read ✓');
    await loadNotifications();
  } catch (error) {
    console.log(error);
  }
};

// Enter key to create project
document.addEventListener('DOMContentLoaded', () => {
  const projectName = document.getElementById('projectName');
  if (projectName) {
    projectName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') createProject();
    });
  }
});

// ===== INIT =====
initDashboard();