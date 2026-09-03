const router = require('express').Router();
const controller = require('../controllers/locationController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', requirePermission(PERMISSIONS.MANAGE_LOCATIONS), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.MANAGE_LOCATIONS), controller.update);

module.exports = router;
