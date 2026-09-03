const router = require('express').Router();
const controller = require('../controllers/settingsController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

// Any authenticated user may read business settings (needed for receipts, reports, etc).
router.get('/', controller.getAll);
router.put('/', requirePermission(PERMISSIONS.MANAGE_SYSTEM_SETTINGS), controller.update);

module.exports = router;
