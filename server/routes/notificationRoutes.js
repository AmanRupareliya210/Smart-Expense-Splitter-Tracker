const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendSettlementReminder
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { ensureGroupMember } = require('../middleware/groupGuard');

// All notification routes are authenticated
router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

// Group-level settlement reminder route
router.post('/groups/:groupId/reminders', ensureGroupMember, sendSettlementReminder);
router.post('/:groupId/reminders', ensureGroupMember, sendSettlementReminder);

module.exports = router;
