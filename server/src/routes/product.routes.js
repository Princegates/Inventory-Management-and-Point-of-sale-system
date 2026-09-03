const router = require('express').Router();
const controller = require('../controllers/productController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/pos-search', controller.posSearch);
router.get('/lookup/:code', controller.lookup);
router.get('/:id/price-history', requirePermission(PERMISSIONS.VIEW_PRODUCTS), controller.priceHistory);
router.get('/:id', controller.get);
router.get('/', controller.list);
router.post('/', requirePermission(PERMISSIONS.CREATE_PRODUCTS), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.EDIT_PRODUCTS), controller.update);

module.exports = router;
