const jwt = require('jsonwebtoken');
const db = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

// Verifies the JWT, loads the user + role + permissions + assigned locations, and attaches
// them to req.user for downstream permission/location-access middleware.
const authenticate = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired session');
  }

  const user = await db.User.findByPk(payload.sub, {
    include: [
      { model: db.Role, as: 'role', include: [{ model: db.Permission, as: 'permissions' }] },
      { model: db.Location, as: 'locations' },
    ],
  });

  if (!user || user.status !== 'active') {
    throw new ApiError(401, 'Account is inactive or no longer exists');
  }

  req.user = user;
  req.userPermissions = new Set((user.role?.permissions || []).map((p) => p.code));
  req.userLocationIds = new Set((user.locations || []).map((l) => l.id));
  next();
});

module.exports = { authenticate };
