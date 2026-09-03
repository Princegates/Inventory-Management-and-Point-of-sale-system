const router = require('express').Router();
const controller = require('../controllers/userController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.use(requirePermission(PERMISSIONS.MANAGE_USERS));

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.post('/:id/disable', controller.disable);
router.post('/:id/enable', controller.enable);

module.exports = router;
