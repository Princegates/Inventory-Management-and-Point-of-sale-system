const bcrypt = require('bcryptjs');
const db = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logAudit } = require('../services/auditLogger');
const { serializeUser } = require('./authController');

const include = [
  { model: db.Role, as: 'role', include: [{ model: db.Permission, as: 'permissions' }] },
  { model: db.Location, as: 'locations' },
];

const list = catchAsync(async (req, res) => {
  const users = await db.User.findAll({ include, order: [['name', 'ASC']] });
  res.json({ users: users.map(serializeUser) });
});

const get = catchAsync(async (req, res) => {
  const user = await db.User.findByPk(req.params.id, { include });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user: serializeUser(user) });
});

const create = catchAsync(async (req, res) => {
  const { name, email, password, roleId, locationIds = [], hasGlobalLocationAccess = false } = req.body;
  if (!name || !email || !password || !roleId) throw new ApiError(400, 'name, email, password and roleId are required');

  const existing = await db.User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) throw new ApiError(409, 'A user with this email already exists');

  const user = await db.User.create({
    name, email: email.toLowerCase(), role_id: roleId,
    has_global_location_access: hasGlobalLocationAccess,
    password_hash: await bcrypt.hash(password, 10),
  });

  if (locationIds.length) await user.setLocations(locationIds);
  await logAudit({ userId: req.user.id, action: 'CREATE_USER', entityType: 'user', entityId: user.id, newValue: { name, email, roleId } });

  const created = await db.User.findByPk(user.id, { include });
  res.status(201).json({ user: serializeUser(created) });
});

const update = catchAsync(async (req, res) => {
  const user = await db.User.scope('withPassword').findByPk(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const before = { name: user.name, email: user.email, role_id: user.role_id, status: user.status };
  const { name, email, roleId, locationIds, hasGlobalLocationAccess, status, password } = req.body;

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email.toLowerCase();
  if (roleId !== undefined) user.role_id = roleId;
  if (hasGlobalLocationAccess !== undefined) user.has_global_location_access = hasGlobalLocationAccess;
  if (status !== undefined) user.status = status;
  if (password) user.password_hash = await bcrypt.hash(password, 10);
  await user.save();

  if (locationIds !== undefined) await user.setLocations(locationIds);

  await logAudit({ userId: req.user.id, action: 'UPDATE_USER', entityType: 'user', entityId: user.id, previousValue: before, newValue: req.body });

  const updated = await db.User.findByPk(user.id, { include });
  res.json({ user: serializeUser(updated) });
});

// Disable rather than delete - completed records/audit trail must remain attributable to the user.
const disable = catchAsync(async (req, res) => {
  const user = await db.User.findByPk(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  user.status = 'disabled';
  await user.save();
  await logAudit({ userId: req.user.id, action: 'DISABLE_USER', entityType: 'user', entityId: user.id });
  res.json({ success: true });
});

const enable = catchAsync(async (req, res) => {
  const user = await db.User.findByPk(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  user.status = 'active';
  await user.save();
  await logAudit({ userId: req.user.id, action: 'ENABLE_USER', entityType: 'user', entityId: user.id });
  res.json({ success: true });
});

module.exports = { list, get, create, update, disable, enable };
