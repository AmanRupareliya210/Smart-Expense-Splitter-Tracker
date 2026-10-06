const express = require('express');
const router = express.Router();
const {
  createGroup,
  getMyGroups,
  getGroupDetails,
  updateGroup,
  archiveGroup,
  unarchiveGroup,
  deleteGroup,
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
  leaveGroup,
  transferOwnership
} = require('../controllers/groupController');
const {
  createInvitation,
  getGroupInvitations,
  revokeInvitation
} = require('../controllers/invitationController');
const { sendSettlementReminder } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const {
  ensureGroupMember,
  ensureGroupAdmin,
  ensureGroupOwner
} = require('../middleware/groupGuard');

// All group routes require authentication
router.use(protect);

// Group CRUD
router.post('/', createGroup);
router.get('/', getMyGroups);
router.get('/:groupId', ensureGroupMember, getGroupDetails);
router.patch('/:groupId', ensureGroupMember, ensureGroupAdmin, updateGroup);
router.put('/:groupId', ensureGroupMember, ensureGroupAdmin, updateGroup);
router.post('/:groupId/archive', ensureGroupMember, ensureGroupAdmin, archiveGroup);
router.post('/:groupId/unarchive', ensureGroupMember, ensureGroupAdmin, unarchiveGroup);
router.delete('/:groupId', ensureGroupMember, ensureGroupOwner, deleteGroup);

// Member Management
router.get('/:groupId/members', ensureGroupMember, getMembers);
router.post('/:groupId/members', ensureGroupMember, ensureGroupAdmin, addMember);
router.patch('/:groupId/members/:userId/role', ensureGroupMember, ensureGroupAdmin, updateMemberRole);
router.delete('/:groupId/members/:userId', ensureGroupMember, removeMember);
router.post('/:groupId/leave', ensureGroupMember, leaveGroup);
router.post('/:groupId/transfer-ownership', ensureGroupMember, ensureGroupOwner, transferOwnership);

// Group Invitations
router.post('/:groupId/invitations', ensureGroupMember, ensureGroupAdmin, createInvitation);
router.get('/:groupId/invitations', ensureGroupMember, ensureGroupAdmin, getGroupInvitations);
router.delete('/:groupId/invitations/:invitationId', ensureGroupMember, ensureGroupAdmin, revokeInvitation);

// Settlement Reminders
router.post('/:groupId/reminders', ensureGroupMember, sendSettlementReminder);

module.exports = router;
