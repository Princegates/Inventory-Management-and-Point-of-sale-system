const db = require('../models');

/**
 * Records an audit trail entry (SRS section 39). Audit records are never exposed for editing
 * or deletion through the API - see auditLog.routes.js (read-only).
 */
async function logAudit({ userId, action, entityType, entityId, previousValue, newValue, referenceTransaction, ipAddress }, transaction) {
  return db.AuditLog.create({
    user_id: userId ?? null,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    previous_value: previousValue ?? null,
    new_value: newValue ?? null,
    reference_transaction: referenceTransaction ?? null,
    ip_address: ipAddress ?? null,
  }, { transaction });
}

module.exports = { logAudit };
