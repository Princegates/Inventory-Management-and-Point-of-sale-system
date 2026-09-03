const db = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logAudit } = require('../services/auditLogger');

const include = [{ model: db.Permission, as: 'permissions' }];

const list = catchAsync(async (req, res) => {
  const roles = await db.Role.findAll({ include, order: [['name', 'ASC']] });
  res.json({ roles });
});

const listPermissions = catchAsync(async (req, res) => {
  const permissions = await db.Permission.findAll({ order: [['code', 'ASC']] });
  res.json({ permissions });
});

const create = catchAsync(async (req, res) => {
  const { name, description, maxDiscountPercent = 0, permissionIds = [] } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const role = await db.Role.create({ name, description, max_discount_percent: maxDiscountPercent });
  if (permissionIds.length) await role.setPermissions(permissionIds);
  await logAudit({ userId: req.user.id, action: 'CREATE_ROLE', entityType: 'role', entityId: role.id, newValue: req.body });
  const created = await db.Role.findByPk(role.id, { include });
  res.status(201).json({ role: created });
});

const update = catchAsync(async (req, res) => {
  const role = await db.Role.findByPk(req.params.id);
  if (!role) throw new ApiError(404, 'Role not found');
  if (role.is_system) throw new ApiError(403, 'System roles cannot be modified');

  const before = { name: role.name, max_discount_percent: role.max_discount_percent };
  const { name, description, maxDiscountPercent, permissionIds } = req.body;
  if (name !== undefined) role.name = name;
  if (description !== undefined) role.description = description;
  if (maxDiscountPercent !== undefined) role.max_discount_percent = maxDiscountPercent;
  await role.save();
  if (permissionIds !== undefined) await role.setPermissions(permissionIds);

  await logAudit({ userId: req.user.id, action: 'UPDATE_ROLE', entityType: 'role', entityId: role.id, previousValue: before, newValue: req.body });
  const updated = await db.Role.findByPk(role.id, { include });
  res.json({ role: updated });
});

const remove = catchAsync(async (req, res) => {
  const role = await db.Role.findByPk(req.params.id);
  if (!role) throw new ApiError(404, 'Role not found');
  if (role.is_system) throw new ApiError(403, 'System roles cannot be deleted');
  const userCount = await db.User.count({ where: { role_id: role.id } });
  if (userCount > 0) throw new ApiError(409, 'Cannot delete a role that is still assigned to users');
  await role.destroy();
  await logAudit({ userId: req.user.id, action: 'DELETE_ROLE', entityType: 'role', entityId: role.id });
  res.json({ success: true });
});

module.exports = { list, listPermissions, create, update, remove };
