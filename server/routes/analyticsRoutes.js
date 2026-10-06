const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getUserDashboardAnalytics,
  getGroupAnalytics,
  getGroupActivity
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { ensureGroupMember } = require('../middleware/groupGuard');

router.use(protect);

// User-level dashboard analytics
router.get('/dashboard', getUserDashboardAnalytics);
router.get('/user-dashboard', getUserDashboardAnalytics);

// Group-specific analytics & activity timeline
router.get('/:groupId/analytics', ensureGroupMember, getGroupAnalytics);
router.get('/:groupId/activity', ensureGroupMember, getGroupActivity);

module.exports = router;
