const express = require('express');
const router = express.Router();
const { register, login, quickLogin, logout, getMe, updateProfile, searchUsers } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/quick-login', quickLogin);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/search', protect, searchUsers);

module.exports = router;
