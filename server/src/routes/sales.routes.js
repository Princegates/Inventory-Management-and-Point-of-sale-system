const router = require('express').Router();
const controller = require('../controllers/salesController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/', requirePermission(PERMISSIONS.CREATE_SALE, PERMISSIONS.VIEW_REPORTS), controller.list);
router.get('/:id', requirePermission(PERMISSIONS.CREATE_SALE, PERMISSIONS.VIEW_REPORTS), controller.get);
router.post('/', requirePermission(PERMISSIONS.CREATE_SALE), controller.create);
router.post('/:id/void', requirePermission(PERMISSIONS.VOID_SALE), controller.voidSale);

module.exports = router;
