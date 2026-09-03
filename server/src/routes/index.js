const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

router.use('/auth', require('./auth.routes'));

// Everything below requires a valid session.
router.use(authenticate);

router.use('/users', require('./user.routes'));
router.use('/roles', require('./role.routes'));
router.use('/locations', require('./location.routes'));
router.use('/categories', require('./category.routes'));
router.use('/lookups', require('./lookup.routes'));
router.use('/suppliers', require('./supplier.routes'));
router.use('/customers', require('./customer.routes'));
router.use('/products', require('./product.routes'));
router.use('/inventory', require('./inventory.routes'));
router.use('/purchase-orders', require('./purchaseOrder.routes'));
router.use('/goods-receipts', require('./goodsReceipt.routes'));
router.use('/stock-transfers', require('./stockTransfer.routes'));
router.use('/stock-counts', require('./stockCount.routes'));
router.use('/stock-adjustments', require('./stockAdjustment.routes'));
router.use('/cashier-sessions', require('./cashierSession.routes'));
router.use('/sales', require('./sales.routes'));
router.use('/returns', require('./return.routes'));
router.use('/reports', require('./report.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/audit-logs', require('./auditLog.routes'));

module.exports = router;
