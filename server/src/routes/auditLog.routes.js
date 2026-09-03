const router = require('express').Router();
const controller = require('../controllers/auditLogController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/', requirePermission(PERMISSIONS.VIEW_AUDIT_LOG), controller.list);

module.exports = router;
