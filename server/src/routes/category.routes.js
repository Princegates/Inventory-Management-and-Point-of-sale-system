const router = require('express').Router();
const controller = require('../controllers/categoryController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/', controller.list);
router.post('/', requirePermission(PERMISSIONS.MANAGE_CATEGORIES), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.MANAGE_CATEGORIES), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.MANAGE_CATEGORIES), controller.remove);

module.exports = router;
