const router = require('express').Router();
const controller = require('../controllers/returnController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.use(requirePermission(PERMISSIONS.REFUND_SALE));

router.get('/', controller.list);
router.get('/sale/:saleId/returnable', controller.returnableItems);
router.post('/', controller.create);

module.exports = router;
