const router = require('express').Router();
const controller = require('../controllers/supplierController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), controller.update);

module.exports = router;
