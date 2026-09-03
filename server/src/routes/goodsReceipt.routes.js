const router = require('express').Router();
const controller = require('../controllers/goodsReceiptController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.use(requirePermission(PERMISSIONS.RECEIVE_STOCK));

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);

module.exports = router;
