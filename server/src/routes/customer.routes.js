const router = require('express').Router();
const controller = require('../controllers/customerController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', requirePermission(PERMISSIONS.MANAGE_CUSTOMERS, PERMISSIONS.CREATE_SALE), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), controller.update);

module.exports = router;
