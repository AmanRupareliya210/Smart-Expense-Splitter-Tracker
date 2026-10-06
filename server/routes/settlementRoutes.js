const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  recordSettlement,
  getGroupSettlements,
  getSettlementDetails,
  updateSettlement,
  reverseSettlement,
  getGroupBalances,
  getSettlementSuggestions,
  getUserGlobalSummary
} = require('../controllers/settlementController');
const { protect } = require('../middleware/authMiddleware');
const { ensureGroupMember } = require('../middleware/groupGuard');

router.use(protect);

// Global user net summary across all groups
router.get('/user-summary', getUserGlobalSummary);

// Group Balances & Settlement Suggestions
router.get('/:groupId/balances', ensureGroupMember, getGroupBalances);
router.get('/:groupId/settlement-suggestions', ensureGroupMember, getSettlementSuggestions);

// Group Settlements Collection
router.route('/:groupId/settlements')
  .post(ensureGroupMember, recordSettlement)
  .get(ensureGroupMember, getGroupSettlements);

// Single Settlement Resource
router.route('/:groupId/settlements/:settlementId')
  .get(ensureGroupMember, getSettlementDetails)
  .patch(ensureGroupMember, updateSettlement)
  .delete(ensureGroupMember, reverseSettlement);

// Explicit Reversal Action
router.post('/:groupId/settlements/:settlementId/reverse', ensureGroupMember, reverseSettlement);

module.exports = router;
