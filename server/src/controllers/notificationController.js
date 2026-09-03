const { Op } = require('sequelize');
const db = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

// Notifications are either targeted at a specific user or broadcast (user_id null) - e.g.
// low-stock alerts are broadcast to anyone who can view inventory (SRS section 49).
const list = catchAsync(async (req, res) => {
  const where = { [Op.or]: [{ user_id: req.user.id }, { user_id: null }] };
  if (req.query.unreadOnly === 'true') where.is_read = false;
  const notifications = await db.Notification.findAll({ where, order: [['created_at', 'DESC']], limit: 100 });
  res.json({ notifications });
});

const markRead = catchAsync(async (req, res) => {
  const notification = await db.Notification.findByPk(req.params.id);
  if (!notification) throw new ApiError(404, 'Notification not found');
  notification.is_read = true;
  await notification.save();
  res.json({ notification });
});

module.exports = { list, markRead };
