const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logAudit } = require('../services/auditLogger');

function signToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  });
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    hasGlobalLocationAccess: user.has_global_location_access,
    role: user.role ? { id: user.role.id, name: user.role.name, maxDiscountPercent: Number(user.role.max_discount_percent) } : null,
    permissions: (user.role?.permissions || []).map((p) => p.code),
    locations: (user.locations || []).map((l) => ({ id: l.id, name: l.name, type: l.type })),
  };
}

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await db.User.scope('withPassword').findOne({
    where: { email: email.toLowerCase() },
    include: [
      { model: db.Role, as: 'role', include: [{ model: db.Permission, as: 'permissions' }] },
      { model: db.Location, as: 'locations' },
    ],
  });

  if (!user || user.status !== 'active') throw new ApiError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new ApiError(401, 'Invalid credentials');

  user.last_login_at = new Date();
  await user.save();
  await logAudit({ userId: user.id, action: 'LOGIN', entityType: 'user', entityId: user.id, ipAddress: req.ip });

  res.json({ token: signToken(user), user: serializeUser(user) });
});

const me = catchAsync(async (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

const logout = catchAsync(async (req, res) => {
  await logAudit({ userId: req.user.id, action: 'LOGOUT', entityType: 'user', entityId: req.user.id, ipAddress: req.ip });
  res.json({ success: true });
});

const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw new ApiError(400, 'New password must be at least 8 characters');

  const user = await db.User.scope('withPassword').findByPk(req.user.id);
  const valid = await bcrypt.compare(currentPassword || '', user.password_hash);
  if (!valid) throw new ApiError(401, 'Current password is incorrect');

  user.password_hash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ success: true });
});

// Generates a reset token. In production this would be emailed to the user (SRS section 61
// lists email/SMS integrations as future work); for now it is returned to an administrator so
// the workflow is usable end-to-end without an SMTP dependency.
const requestPasswordReset = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await db.User.findOne({ where: { email: (email || '').toLowerCase() } });
  if (!user) return res.json({ success: true }); // do not leak account existence

  const token = crypto.randomBytes(24).toString('hex');
  user.reset_token = token;
  user.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  res.json({ success: true, resetToken: token, expiresAt: user.reset_token_expires });
});

const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw new ApiError(400, 'New password must be at least 8 characters');

  const user = await db.User.scope('withPassword').findOne({ where: { reset_token: token } });
  if (!user || !user.reset_token_expires || user.reset_token_expires < new Date()) {
    throw new ApiError(400, 'Reset token is invalid or has expired');
  }

  user.password_hash = await bcrypt.hash(newPassword, 10);
  user.reset_token = null;
  user.reset_token_expires = null;
  await user.save();
  res.json({ success: true });
});

module.exports = { login, me, logout, changePassword, requestPasswordReset, resetPassword, serializeUser };
