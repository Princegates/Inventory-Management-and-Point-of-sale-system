const ApiError = require('../utils/ApiError');

// Location-based access control (SRS section 43): a user with `has_global_location_access`
// (typically Super Administrator / Head Office) may act on any location; everyone else is
// restricted to their assigned locations.
function canAccessLocation(req, locationId) {
  if (!locationId) return true;
  if (req.user.has_global_location_access) return true;
  return req.userLocationIds.has(Number(locationId));
}

function assertLocationAccess(req, locationId) {
  if (!canAccessLocation(req, locationId)) {
    throw new ApiError(403, 'You are not authorized to access this location');
  }
}

// Express middleware variant for routes that carry the location id as a param/query field.
function requireLocationAccess(paramName = 'locationId') {
  return (req, res, next) => {
    const locationId = req.params[paramName] || req.query[paramName] || req.body[paramName];
    try {
      assertLocationAccess(req, locationId);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { canAccessLocation, assertLocationAccess, requireLocationAccess };
