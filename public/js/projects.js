let allProjects = [];
let selectedColor = '#e94560';

// ===== INIT =====
const initProjects = async () => {
  if (!requireAuth()) return;

  const user = getUser();
  if (user) {
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  }

  await loadProjects();
};

// ===== LOAD PROJECTS =====
const loadProjects = async () => {
  const grid = document.getElementById('projectsGrid');
  try {
    allProjects = await api('/projects');
    renderProjects(allProjects);
  } catch (error) {
    grid.innerHTML = '<p class="loading-text">Failed to load projects.</p>';
  }
};

// ===== RENDER PROJECTS =====
const renderProjects = (projects) => {
  const grid = document.getElementById('projectsGrid');

  if (projects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="ph ph-kanban"></i>
        <h3>No projects found</h3>
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

  grid.innerHTML = projects.map(project => `
    <div class="project-card"
      onclick="window.location.href='project.html?id=${project._id}'">
      <div class="project-color-bar" style="background:${project.color}"></div>
      <div class="project-card-top">
        <div class="project-icon" style="background:${project.color}20;color:${project.color}">
          <i class="ph ph-kanban"></i>
        </div>
        <button class="project-menu-btn"
          onclick="event.stopPropagation(); deleteProject('${project._id}')">
          <i class="ph ph-trash"></i>
        </button>
      </div>
      <p class="project-name">${project.name}</p>
      <p class="project-desc">${project.description || 'No description'}</p>
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

// ===== FILTER PROJECTS =====
const filterProjects = () => {
  const query = document.getElementById('searchProjects').value.toLowerCase();
  const sort = document.getElementById('sortProjects').value;

  let filtered = allProjects.filter(p =>
    p.name.toLowerCase().includes(query) ||
    (p.description && p.description.toLowerCase().includes(query))
  );

  if (sort === 'newest') {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sort === 'oldest') {
    filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sort === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  renderProjects(filtered);
};

// ===== CREATE PROJECT =====
const createProject = async () => {
  const name = document.getElementById('projectName').value.trim();
  const description = document.getElementById('projectDesc').value.trim();

  if (!name) {
    showAlert('modalAlert', 'Project name is required', 'error');
    return;
  }

  try {
    await api('/projects', 'POST', { name, description, color: selectedColor });
    closeProjectModal();
    showToast('Project created! ✓');
    await loadProjects();
  } catch (error) {
    showAlert('modalAlert', error.message, 'error');
  }
};

// ===== DELETE PROJECT =====
const deleteProject = async (id) => {
  if (!confirm('Delete this project? This cannot be undone.')) return;
  try {
    await api(`/projects/${id}`, 'DELETE');
    showToast('Project deleted');
    await loadProjects();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

// ===== MODAL =====
const openProjectModal = () => {
  document.getElementById('projectModal').style.display = 'flex';
};

const closeProjectModal = () => {
  document.getElementById('projectModal').style.display = 'none';
  document.getElementById('projectName').value = '';
  document.getElementById('projectDesc').value = '';
};

const selectColor = (el) => {
  document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  selectedColor = el.dataset.color;
};

// ===== INIT =====
initProjects();