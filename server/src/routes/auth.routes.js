const router = require('express').Router();
const auth = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', auth.login);
router.post('/forgot-password', auth.requestPasswordReset);
router.post('/reset-password', auth.resetPassword);
router.get('/me', authenticate, auth.me);
router.post('/logout', authenticate, auth.logout);
router.post('/change-password', authenticate, auth.changePassword);

module.exports = router;
