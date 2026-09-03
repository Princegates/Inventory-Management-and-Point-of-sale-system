const router = require('express').Router();
const controller = require('../controllers/stockAdjustmentController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/', requirePermission(PERMISSIONS.ADJUST_INVENTORY, PERMISSIONS.VIEW_INVENTORY), controller.list);
router.post('/', requirePermission(PERMISSIONS.ADJUST_INVENTORY), controller.create);

module.exports = router;
