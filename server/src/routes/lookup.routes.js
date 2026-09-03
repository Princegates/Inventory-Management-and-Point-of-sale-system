const router = require('express').Router();
const { brands, units } = require('../controllers/lookupController');
const { requirePermission } = require('../middleware/permission');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/brands', brands.list);
router.post('/brands', requirePermission(PERMISSIONS.MANAGE_CATEGORIES), brands.create);
router.put('/brands/:id', requirePermission(PERMISSIONS.MANAGE_CATEGORIES), brands.update);
router.delete('/brands/:id', requirePermission(PERMISSIONS.MANAGE_CATEGORIES), brands.remove);

router.get('/units', units.list);
router.post('/units', requirePermission(PERMISSIONS.MANAGE_CATEGORIES), units.create);
router.put('/units/:id', requirePermission(PERMISSIONS.MANAGE_CATEGORIES), units.update);
router.delete('/units/:id', requirePermission(PERMISSIONS.MANAGE_CATEGORIES), units.remove);

module.exports = router;
