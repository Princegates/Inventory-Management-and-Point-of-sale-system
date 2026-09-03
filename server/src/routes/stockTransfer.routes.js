const router = require('express').Router();
const controller = require('../controllers/stockTransferController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/', requirePermission(PERMISSIONS.REQUEST_TRANSFER, PERMISSIONS.APPROVE_TRANSFER), controller.list);
router.get('/:id', requirePermission(PERMISSIONS.REQUEST_TRANSFER, PERMISSIONS.APPROVE_TRANSFER), controller.get);
router.post('/', requirePermission(PERMISSIONS.REQUEST_TRANSFER), controller.create);
router.post('/:id/approve', requirePermission(PERMISSIONS.APPROVE_TRANSFER), controller.approve);
router.post('/:id/issue', requirePermission(PERMISSIONS.ISSUE_TRANSFER), controller.issue);
router.post('/:id/receive', requirePermission(PERMISSIONS.RECEIVE_TRANSFER), controller.receive);
router.post('/:id/cancel', requirePermission(PERMISSIONS.APPROVE_TRANSFER, PERMISSIONS.REQUEST_TRANSFER), controller.cancel);

module.exports = router;
