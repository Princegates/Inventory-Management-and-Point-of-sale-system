const router = require('express').Router();
const controller = require('../controllers/notificationController');

router.get('/', controller.list);
router.post('/:id/read', controller.markRead);

module.exports = router;
