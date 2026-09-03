const ApiError = require('../utils/ApiError');

// Role-based access control (SRS section 41): permissions are granular codes assigned to a
// role rather than hard-coded per user. `requirePermission('CREATE_PRODUCTS')` etc.
function requirePermission(...codes) {
  return (req, res, next) => {
    if (!req.userPermissions) return next(new ApiError(401, 'Authentication required'));
    const hasAny = codes.some((code) => req.userPermissions.has(code));
    if (!hasAny) {
      return next(new ApiError(403, `Missing required permission: ${codes.join(' or ')}`));
    }
    next();
  };
}

module.exports = { requirePermission };
