const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @route POST /api/tasks
const createTask = async (req, res) => {
  const { title, description, project, column, priority, assignees, dueDate, labels } = req.body;
  try {
    // Check user is project member
    const projectDoc = await Project.findById(project);
    if (!projectDoc) return res.status(404).json({ message: 'Project not found' });

    const isMember = projectDoc.members.some(
      m => m.user.toString() === req.user._id.toString()
    );
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    // Get order (last task in column + 1)
    const lastTask = await Task.findOne({ project, column }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1 : 0;

    const task = await Task.create({
      title,
      description,
      project,
      column: column || 'To Do',
      priority: priority || 'medium',
      assignees: assignees || [],
      dueDate: dueDate || null,
      labels: labels || [],
      createdBy: req.user._id,
      order
    });

    const populated = await Task.findById(task._id)
      .populate('assignees', 'name email')
      .populate('createdBy', 'name email');

    // Notify assignees
    if (assignees && assignees.length > 0) {
      for (const assigneeId of assignees) {
        if (assigneeId !== req.user._id.toString()) {
          await Notification.create({
            recipient: assigneeId,
            sender: req.user._id,
            type: 'task_assigned',
            message: `${req.user.name} assigned you to task "${title}"`,
            project,
            task: task._id
          });

          // Real time notification
          const io = req.app.get('io');
          io.to(assigneeId.toString()).emit('notification', {
            message: `${req.user.name} assigned you to "${title}"`
          });
        }
      }
    }

    // Emit to project room
    const io = req.app.get('io');
    io.to(project).emit('taskAdded', populated);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/tasks/project/:projectId
const getTasksByProject = async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignees', 'name email')
      .populate('createdBy', 'name email')
      .sort({ order: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/tasks/:id
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignees', 'name email')
      .populate('createdBy', 'name email')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'name email' }
      });

    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate('assignees', 'name email')
      .populate('createdBy', 'name email');

    // If column changed emit to project room
    if (req.body.column && req.body.column !== task.column) {
      const io = req.app.get('io');
      io.to(task.project.toString()).emit('taskUpdated', {
        taskId: task._id,
        column: req.body.column,
        projectId: task.project.toString()
      });

      // Notify assignees
      for (const assigneeId of task.assignees) {
        if (assigneeId.toString() !== req.user._id.toString()) {
          await Notification.create({
            recipient: assigneeId,
            sender: req.user._id,
            type: 'task_moved',
            message: `${req.user.name} moved task "${task.title}" to ${req.body.column}`,
            project: task.project,
            task: task._id
          });
        }
      }
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await Task.findByIdAndDelete(req.params.id);

    // Emit to project room
    const io = req.app.get('io');
    io.to(task.project.toString()).emit('taskDeleted', { taskId: req.params.id });

    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route PUT /api/tasks/:id/move
const moveTask = async (req, res) => {
  const { column, order } = req.body;
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { column, order },
      { new: true }
    )
      .populate('assignees', 'name email')
      .populate('createdBy', 'name email');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Emit to project room
    const io = req.app.get('io');
    io.to(task.project.toString()).emit('taskUpdated', {
      taskId: task._id,
      column,
      order,
      projectId: task.project.toString()
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTask,
  getTasksByProject,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask
};