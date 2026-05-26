const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

// @route POST /api/comments
const createComment = async (req, res) => {
  const { content, taskId, projectId } = req.body;
  try {
    if (!content || !taskId || !projectId) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const comment = await Comment.create({
      content,
      task: taskId,
      project: projectId,
      author: req.user._id
    });

    // Add comment to task
    await Task.findByIdAndUpdate(
      taskId,
      { $push: { comments: comment._id } }
    );

    const populated = await Comment.findById(comment._id)
      .populate('author', 'name email');

    // Get task for notification
    const task = await Task.findById(taskId)
      .populate('assignees', '_id name');

    // Notify assignees
    for (const assignee of task.assignees) {
      if (assignee._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: assignee._id,
          sender: req.user._id,
          type: 'comment_added',
          message: `${req.user.name} commented on "${task.title}"`,
          project: projectId,
          task: taskId
        });

        // Real time notification
        const io = req.app.get('io');
        io.to(assignee._id.toString()).emit('notification', {
          message: `${req.user.name} commented on "${task.title}"`
        });
      }
    }

    // Emit comment to project room
    const io = req.app.get('io');
    io.to(projectId).emit('commentAdded', {
      taskId,
      comment: populated
    });

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/comments/task/:taskId
const getCommentsByTask = async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('author', 'name email')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route DELETE /api/comments/:id
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Only author can delete
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Remove from task
    await Task.findByIdAndUpdate(
      comment.task,
      { $pull: { comments: comment._id } }
    );

    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createComment,
  getCommentsByTask,
  deleteComment
};