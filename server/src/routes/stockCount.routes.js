const router = require('express').Router();
const controller = require('../controllers/stockCountController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/', requirePermission(PERMISSIONS.CONDUCT_STOCK_COUNT, PERMISSIONS.APPROVE_STOCK_COUNT), controller.list);
router.get('/:id', requirePermission(PERMISSIONS.CONDUCT_STOCK_COUNT, PERMISSIONS.APPROVE_STOCK_COUNT), controller.get);
router.post('/', requirePermission(PERMISSIONS.CONDUCT_STOCK_COUNT), controller.create);
router.put('/:id/counts', requirePermission(PERMISSIONS.CONDUCT_STOCK_COUNT), controller.recordCounts);
router.post('/:id/submit', requirePermission(PERMISSIONS.CONDUCT_STOCK_COUNT), controller.submit);
router.post('/:id/approve', requirePermission(PERMISSIONS.APPROVE_STOCK_COUNT), controller.approve);

module.exports = router;
