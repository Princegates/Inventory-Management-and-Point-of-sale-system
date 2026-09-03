const router = require('express').Router();
const controller = require('../controllers/cashierSessionController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.use(requirePermission(PERMISSIONS.OPEN_POS_SESSION));

router.get('/', controller.list);
router.get('/current', controller.current);
router.post('/open', controller.open);
router.post('/:id/close', controller.close);

module.exports = router;
