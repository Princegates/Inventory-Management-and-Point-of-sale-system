const router = require('express').Router();
const controller = require('../controllers/inventoryController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.use(requirePermission(PERMISSIONS.VIEW_INVENTORY));

router.get('/', controller.balances);
router.get('/totals', controller.productTotals);
router.get('/ledger', controller.ledger);

module.exports = router;
