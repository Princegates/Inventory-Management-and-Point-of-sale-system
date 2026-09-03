const router = require('express').Router();
const controller = require('../controllers/roleController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/permissions', requirePermission(PERMISSIONS.MANAGE_ROLES, PERMISSIONS.MANAGE_USERS), controller.listPermissions);
router.get('/', requirePermission(PERMISSIONS.MANAGE_ROLES, PERMISSIONS.MANAGE_USERS), controller.list);
router.post('/', requirePermission(PERMISSIONS.MANAGE_ROLES), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.MANAGE_ROLES), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.MANAGE_ROLES), controller.remove);

module.exports = router;
