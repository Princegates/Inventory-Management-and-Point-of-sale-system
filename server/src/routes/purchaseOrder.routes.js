const router = require('express').Router();
const controller = require('../controllers/purchaseOrderController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/', requirePermission(PERMISSIONS.CREATE_PURCHASE, PERMISSIONS.APPROVE_PURCHASE, PERMISSIONS.RECEIVE_STOCK), controller.list);
router.get('/:id', requirePermission(PERMISSIONS.CREATE_PURCHASE, PERMISSIONS.APPROVE_PURCHASE, PERMISSIONS.RECEIVE_STOCK), controller.get);
router.post('/', requirePermission(PERMISSIONS.CREATE_PURCHASE), controller.create);
router.post('/:id/status', requirePermission(PERMISSIONS.CREATE_PURCHASE, PERMISSIONS.APPROVE_PURCHASE), controller.setStatus);

module.exports = router;
