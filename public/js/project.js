let currentProject = null;
let currentTask = null;
let socket = null;
let draggedTaskId = null;

// ===== GET PROJECT ID =====
const getProjectId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
};

// ===== INIT =====
const initProject = async () => {
  if (!requireAuth()) return;

  const user = getUser();
  if (user) {
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  }

  const projectId = getProjectId();
  if (!projectId) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Connect socket
  socket = io();
  socket.emit('joinProject', projectId);

  // Real time listeners
  socket.on('taskAdded', (task) => {
    addTaskToBoard(task);
    showToast(`New task: ${task.title}`);
  });

  socket.on('taskUpdated', (data) => {
    loadBoard(projectId);
    showToast('Board updated');
  });

  socket.on('taskDeleted', (data) => {
    removeTaskFromBoard(data.taskId);
  });

  socket.on('commentAdded', (data) => {
    if (currentTask && currentTask._id === data.taskId) {
      appendComment(data.comment);
    }
  });

  socket.on('notification', (data) => {
    showToast(data.message);
  });

  await loadProject(projectId);
  await loadBoard(projectId);
};

// ===== LOAD PROJECT =====
const loadProject = async (projectId) => {
  try {
    currentProject = await api(`/projects/${projectId}`);
    document.getElementById('projectTitle').textContent = currentProject.name;
    document.getElementById('projectDesc').textContent = currentProject.description || '';
    document.title = `${currentProject.name} — TaskFlow`;

    // Render members bar
    document.getElementById('membersList').innerHTML = currentProject.members.map(m => `
      <div class="member-chip" title="${m.user.name} (${m.role})">
        <div class="member-avatar-sm" style="background:${currentProject.color}">
          ${m.user.name.charAt(0).toUpperCase()}
        </div>
        <span>${m.user.name.split(' ')[0]}</span>
        <span class="member-role-badge">${m.role}</span>
      </div>
    `).join('');

    document.getElementById('boardMeta').innerHTML = `
      <span class="meta-chip">
        <i class="ph ph-users"></i> ${currentProject.members.length} members
      </span>
    `;
  } catch (error) {
    showToast('Failed to load project', 'error');
    window.location.href = 'dashboard.html';
  }
};

// ===== LOAD BOARD =====
const loadBoard = async (projectId) => {
  const board = document.getElementById('board');
  try {
    const tasks = await api(`/tasks/project/${projectId}`);
    const columns = currentProject?.columns || ['To Do', 'In Progress', 'Review', 'Done'];

    board.innerHTML = columns.map(column => {
      const columnTasks = tasks.filter(t => t.column === column);
      return `
        <div class="board-column"
          data-column="${column}"
          ondragover="allowDrop(event)"
          ondragleave="dragLeave(event)"
          ondrop="dropTask(event, '${column}')">
          <div class="column-header">
            <div class="column-title">
              <span class="column-dot" style="background:${getColumnColor(column)}"></span>
              <h3>${column}</h3>
              <span class="column-count" id="count-${column.replace(/\s/g,'-')}">${columnTasks.length}</span>
            </div>
            <button class="btn-add-task" onclick="openTaskModal('${column}')">
              <i class="ph ph-plus"></i>
            </button>
          </div>
          <div class="task-list" id="col-${column.replace(/\s/g,'-')}">
            ${columnTasks.length > 0
              ? columnTasks.map(task => renderTaskCard(task)).join('')
              : `<div class="empty-column">
                  <i class="ph ph-plus-circle"></i>
                  <p>No tasks</p>
                </div>`
            }
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    board.innerHTML = '<p class="loading-text">Failed to load board.</p>';
  }
};

// ===== RENDER TASK CARD =====
const renderTaskCard = (task) => {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.column !== 'Done';
  const labelColors = {
    'Bug': '#fef2f2', 'Feature': '#f0fdf4',
    'Design': '#faf5ff', 'Backend': '#eff6ff',
    'Frontend': '#fffbeb', 'Urgent': '#fff1f2'
  };

  return `
    <div class="task-card"
      id="task-${task._id}"
      draggable="true"
      ondragstart="dragStart(event, '${task._id}')"
      ondragend="dragEnd(event)"
      onclick="openTaskDetail('${task._id}')">
      <div class="task-card-top">
        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
        ${isOverdue ? '<span class="overdue-badge"><i class="ph ph-warning"></i> Overdue</span>' : ''}
      </div>
      ${task.labels && task.labels.length > 0 ? `
        <div class="task-labels">
          ${task.labels.map(label => `
            <span class="task-label" style="background:${labelColors[label] || '#f0f4ff'}">
              ${label}
            </span>
          `).join('')}
        </div>
      ` : ''}
      <p class="task-title">${task.title}</p>
      ${task.description ? `
        <p class="task-desc">${task.description.slice(0, 70)}${task.description.length > 70 ? '...' : ''}</p>
      ` : ''}
      <div class="task-card-footer">
        <div class="task-assignees">
          ${task.assignees.slice(0, 3).map(a => `
            <div class="assignee-avatar" title="${a.name}">
              ${a.name.charAt(0).toUpperCase()}
            </div>
          `).join('')}
          ${task.assignees.length > 3 ? `<div class="assignee-avatar">+${task.assignees.length - 3}</div>` : ''}
        </div>
        <div class="task-meta">
          ${task.dueDate ? `
            <span class="due-date ${isOverdue ? 'overdue' : ''}">
              <i class="ph ph-calendar"></i>
              ${new Date(task.dueDate).toLocaleDateString('en-NG', { day:'numeric', month:'short' })}
            </span>
          ` : ''}
          ${task.comments && task.comments.length > 0 ? `
            <span class="comment-count">
              <i class="ph ph-chat-circle"></i> ${task.comments.length}
            </span>
          ` : ''}
        </div>
      </div>
    </div>
  `;
};

// ===== COLUMN COLOR =====
const getColumnColor = (column) => {
  const colors = {
    'To Do': '#94a3b8',
    'In Progress': '#6366f1',
    'Review': '#f59e0b',
    'Done': '#10b981'
  };
  return colors[column] || '#94a3b8';
};

// ===== DRAG AND DROP =====
const dragStart = (e, taskId) => {
  draggedTaskId = taskId;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => {
    const card = document.getElementById(`task-${taskId}`);
    if (card) card.classList.add('dragging');
  }, 0);
};

const dragEnd = (e) => {
  const card = document.getElementById(`task-${draggedTaskId}`);
  if (card) card.classList.remove('dragging');
  document.querySelectorAll('.board-column').forEach(col => {
    col.classList.remove('drag-over');
  });
};

const allowDrop = (e) => {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
};

const dragLeave = (e) => {
  e.currentTarget.classList.remove('drag-over');
};

const dropTask = async (e, column) => {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!draggedTaskId) return;

  try {
    await api(`/tasks/${draggedTaskId}/move`, 'PUT', { column });
    draggedTaskId = null;
    await loadBoard(currentProject._id);
    showToast(`Moved to ${column} ✓`);
  } catch (error) {
    showToast('Failed to move task', 'error');
  }
};

// ===== REAL TIME BOARD UPDATES =====
const addTaskToBoard = (task) => {
  const colId = `col-${task.column.replace(/\s/g,'-')}`;
  const col = document.getElementById(colId);
  if (col) {
    const empty = col.querySelector('.empty-column');
    if (empty) empty.remove();
    col.insertAdjacentHTML('beforeend', renderTaskCard(task));
    updateColumnCount(task.column);
  }
};

const removeTaskFromBoard = (taskId) => {
  const el = document.getElementById(`task-${taskId}`);
  if (el) el.remove();
};

const updateColumnCount = (column) => {
  const countEl = document.getElementById(`count-${column.replace(/\s/g,'-')}`);
  const colEl = document.getElementById(`col-${column.replace(/\s/g,'-')}`);
  if (countEl && colEl) {
    countEl.textContent = colEl.querySelectorAll('.task-card').length;
  }
};

// ===== TASK MODAL =====
const openTaskModal = (column = 'To Do') => {
  document.getElementById('taskColumn').value = column;
  document.getElementById('taskModal').style.display = 'flex';
  document.getElementById('taskTitle').focus();
};

const closeTaskModal = () => {
  document.getElementById('taskModal').style.display = 'none';
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
  document.getElementById('taskDueDate').value = '';
};

const createTask = async () => {
  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDesc').value.trim();
  const column = document.getElementById('taskColumn').value;
  const priority = document.getElementById('taskPriority').value;
  const dueDate = document.getElementById('taskDueDate').value;

  if (!title) {
    showAlert('taskAlert', 'Task title is required', 'error');
    return;
  }

  try {
    await api('/tasks', 'POST', {
      title,
      description,
      project: currentProject._id,
      column,
      priority,
      dueDate: dueDate || null
    });
    closeTaskModal();
    await loadBoard(currentProject._id);
    showToast('Task created! ✓');
  } catch (error) {
    showAlert('taskAlert', error.message, 'error');
  }
};

// ===== TASK DETAIL =====
const openTaskDetail = async (taskId) => {
  try {
    currentTask = await api(`/tasks/${taskId}`);
    renderTaskDetail(currentTask);
    document.getElementById('taskDetailModal').style.display = 'flex';
    loadComments(taskId);
  } catch (error) {
    showToast('Failed to load task', 'error');
  }
};

const renderTaskDetail = (task) => {
  document.getElementById('detailTitle').textContent = task.title;
  document.getElementById('detailDesc').textContent = task.description || 'No description added yet.';
  document.getElementById('detailColumn').value = task.column;
  document.getElementById('detailCreatedBy').textContent = task.createdBy?.name || 'Unknown';

  // Priority
  const priority = document.getElementById('detailPriority');
  priority.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
  priority.className = `priority-badge priority-${task.priority}`;

  // Due date
  document.getElementById('detailDueDate').innerHTML = task.dueDate
    ? `<i class="ph ph-calendar"></i> ${new Date(task.dueDate).toLocaleDateString('en-NG', { weekday:'short', year:'numeric', month:'short', day:'numeric' })}`
    : '<i class="ph ph-calendar"></i> Not set';

  // Assignees
  document.getElementById('detailAssignees').innerHTML = task.assignees.length > 0
    ? task.assignees.map(a => `
        <div class="assignee-chip">
          <div class="assignee-avatar">${a.name.charAt(0).toUpperCase()}</div>
          <span>${a.name}</span>
        </div>
      `).join('')
    : '<p style="color:var(--text-light);font-size:0.85rem">No assignees yet</p>';

  // Labels
  const labelsContainer = document.getElementById('detailLabels');
  if (labelsContainer) {
    labelsContainer.innerHTML = task.labels && task.labels.length > 0
      ? task.labels.map(l => `<span class="task-label">${l}</span>`).join('')
      : '<p style="color:var(--text-light);font-size:0.85rem">No labels</p>';
  }
};

const closeTaskDetail = () => {
  document.getElementById('taskDetailModal').style.display = 'none';
  currentTask = null;
};

const moveTask = async () => {
  if (!currentTask) return;
  const column = document.getElementById('detailColumn').value;
  try {
    await api(`/tasks/${currentTask._id}/move`, 'PUT', { column });
    await loadBoard(currentProject._id);
    showToast(`Moved to ${column} ✓`);
  } catch (error) {
    showToast('Failed to move task', 'error');
  }
};

const deleteCurrentTask = async () => {
  if (!currentTask) return;
  if (!confirm('Delete this task? This cannot be undone.')) return;
  try {
    await api(`/tasks/${currentTask._id}`, 'DELETE');
    closeTaskDetail();
    await loadBoard(currentProject._id);
    showToast('Task deleted');
  } catch (error) {
    showToast('Failed to delete task', 'error');
  }
};

// ===== ASSIGN MEMBER =====
const assignMember = async () => {
  if (!currentTask) return;
  const user = getUser();

  try {
    const existing = currentTask.assignees.map(a => a._id || a);
    const alreadyAssigned = existing.some(id => id.toString() === user.id);

    if (alreadyAssigned) {
      showToast('You are already assigned', 'error');
      return;
    }

    const updatedAssignees = [...existing, user.id];
    const updated = await api(`/tasks/${currentTask._id}`, 'PUT', {
      assignees: updatedAssignees
    });

    currentTask = updated;
    renderTaskDetail(updated);
    showToast('Assigned successfully ✓');
  } catch (error) {
    showToast('Failed to assign', 'error');
  }
};

// ===== COMMENTS =====
const loadComments = async (taskId) => {
  const list = document.getElementById('commentsList');
  try {
    const comments = await api(`/comments/task/${taskId}`);
    if (comments.length === 0) {
      list.innerHTML = '<p class="no-comments">No comments yet. Start the conversation!</p>';
      return;
    }
    list.innerHTML = comments.map(c => renderComment(c)).join('');
    list.scrollTop = list.scrollHeight;
  } catch (error) {
    list.innerHTML = '<p class="loading-text">Failed to load comments.</p>';
  }
};

const renderComment = (comment) => `
  <div class="comment-item" id="comment-${comment._id}">
    <div class="comment-avatar">
      ${comment.author.name.charAt(0).toUpperCase()}
    </div>
    <div class="comment-content">
      <div class="comment-header">
        <span class="comment-author">${comment.author.name}</span>
        <span class="comment-time">${timeAgo(comment.createdAt)}</span>
      </div>
      <p class="comment-text">${comment.content}</p>
    </div>
  </div>
`;

const appendComment = (comment) => {
  const list = document.getElementById('commentsList');
  const empty = list.querySelector('.no-comments');
  if (empty) empty.remove();
  list.insertAdjacentHTML('beforeend', renderComment(comment));
  list.scrollTop = list.scrollHeight;
};

const addComment = async () => {
  const input = document.getElementById('commentInput');
  const content = input.value.trim();
  if (!content || !currentTask) return;

  try {
    await api('/comments', 'POST', {
      content,
      taskId: currentTask._id,
      projectId: currentProject._id
    });
    input.value = '';
    await loadComments(currentTask._id);
  } catch (error) {
    showToast('Failed to add comment', 'error');
  }
};

// Enter key for comment
document.addEventListener('DOMContentLoaded', () => {
  const commentInput = document.getElementById('commentInput');
  if (commentInput) {
    commentInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addComment();
    });
  }
});

// ===== MEMBER MODAL =====
const openMemberModal = () => {
  document.getElementById('memberModal').style.display = 'flex';
};
const closeMemberModal = () => {
  document.getElementById('memberModal').style.display = 'none';
  document.getElementById('memberEmail').value = '';
};

const addMember = async () => {
  const email = document.getElementById('memberEmail').value.trim();
  const role = document.getElementById('memberRole').value;

  if (!email) {
    showAlert('memberAlert', 'Email is required', 'error');
    return;
  }

  try {
    await api(`/projects/${currentProject._id}/members`, 'POST', { email, role });
    closeMemberModal();
    await loadProject(currentProject._id);
    showToast('Member added! ✓');
  } catch (error) {
    showAlert('memberAlert', error.message, 'error');
  }
};

// ===== INIT =====
initProject();