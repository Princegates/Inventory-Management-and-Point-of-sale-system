const router = require('express').Router();
const controller = require('../controllers/reportController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.use(requirePermission(PERMISSIONS.VIEW_REPORTS));

router.get('/inventory/current', controller.inventoryCurrent);
router.get('/inventory/low-stock', controller.inventoryLowStock);
router.get('/inventory/expiry', controller.inventoryExpiry);
router.get('/inventory/adjustments', controller.stockAdjustmentReport);
router.get('/inventory/stock-count-variance', controller.stockCountVariance);

router.get('/sales/summary', controller.salesSummary);
router.get('/sales/by-dimension', controller.salesByDimension);

router.get('/purchasing/summary', controller.purchasingSummary);

router.get('/profitability', requirePermission(PERMISSIONS.VIEW_FINANCIALS, PERMISSIONS.VIEW_REPORTS), controller.profitability);

module.exports = router;
