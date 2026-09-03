const { Op } = require('sequelize');
const db = require('../models');
const catchAsync = require('../utils/catchAsync');

// Read-only by design (SRS section 39: "Audit records should not be editable by normal users") -
// this module intentionally has no create/update/delete routes exposed through the API; every
// audit row is written internally by services/auditLogger.js.
const list = catchAsync(async (req, res) => {
  const { userId, action, entityType, from, to, page = 1, pageSize = 50 } = req.query;
  const where = {};
  if (userId) where.user_id = userId;
  if (action) where.action = action;
  if (entityType) where.entity_type = entityType;
  if (from || to) {
    where.created_at = {};
    if (from) where.created_at[Op.gte] = new Date(from);
    if (to) where.created_at[Op.lte] = new Date(to);
  }

  const limit = Math.min(Number(pageSize) || 50, 200);
  const offset = (Number(page) - 1) * limit;

  const { rows, count } = await db.AuditLog.findAndCountAll({
    where, include: [{ model: db.User, as: 'user', attributes: ['id', 'name', 'email'] }],
    order: [['created_at', 'DESC']], limit, offset,
  });
  res.json({ auditLogs: rows, total: count, page: Number(page), pageSize: limit });
});

module.exports = { list };
