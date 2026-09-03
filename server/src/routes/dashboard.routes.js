const router = require('express').Router();
const controller = require('../controllers/dashboardController');

router.get('/summary', controller.summary);

module.exports = router;
