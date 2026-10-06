const mongoose = require('mongoose');
const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const ActivityLog = require('../models/ActivityLog');
const Invitation = require('../models/Invitation');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const { calculateGroupBalances } = require('../services/balanceService');
const notificationService = require('../services/notificationService');

/**
 * MODULE 2 — GROUP CRUD APIS
 */

// POST /api/groups — Create a new group
const createGroup = async (req, res, next) => {
  try {
    const { name, description, category, currency } = req.body;

    if (!name || !name.trim()) {
      return next(new ApiError(400, 'Group name is required.'));
    }

    if (name.trim().length > 80) {
      return next(new ApiError(400, 'Group name cannot exceed 80 characters.'));
    }

    if (description && description.trim().length > 300) {
      return next(new ApiError(400, 'Description cannot exceed 300 characters.'));
    }

    const validCategories = ['Trip', 'Home', 'Event', 'Project', 'Couple', 'Other'];
    const selectedCategory = validCategories.includes(category) ? category : 'Other';

    const validCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
    const selectedCurrency = validCurrencies.includes(currency)
      ? currency
      : req.user.defaultCurrency || 'INR';

    const group = await Group.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      category: selectedCategory,
      currency: selectedCurrency,
      createdBy: req.user._id,
      members: [
        {
          userId: req.user._id,
          role: 'owner',
          joinedAt: new Date()
        }
      ]
    });

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'GROUP_CREATED',
      summary: `${req.user.name} created group "${group.name}".`
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('members.userId', 'name email avatarUrl defaultCurrency')
      .populate('createdBy', 'name email');

    return sendSuccess(res, 201, 'Group created successfully', populatedGroup);
  } catch (error) {
    next(error);
  }
};

// GET /api/groups — List user's active groups (with optional includeArchived / search / filter)
const getMyGroups = async (req, res, next) => {
  try {
    const { includeArchived, search, category } = req.query;

    const query = { 'members.userId': req.user._id };

    if (includeArchived === 'true') {
      // Return both active and archived
    } else if (includeArchived === 'only') {
      query.isArchived = true;
    } else {
      query.isArchived = false; // default: active groups only
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const groups = await Group.find(query)
      .populate('members.userId', 'name email avatarUrl defaultCurrency')
      .populate('createdBy', 'name email')
      .populate('archivedBy', 'name email')
      .sort({ updatedAt: -1 });

    // Enrich groups with member count, user role, and net balance summary
    const enrichedGroups = await Promise.all(
      groups.map(async (grp) => {
        const balances = await calculateGroupBalances(grp._id);
        const userBal = balances.memberBalances.find(
          (m) => m.userId === req.user._id.toString()
        );
        const memberEntry = grp.members.find(
          (m) => m.userId && m.userId._id.toString() === req.user._id.toString()
        );

        return {
          ...grp.toObject(),
          memberCount: grp.members.length,
          userRole: memberEntry ? memberEntry.role : 'member',
          totalSpending: balances.totalSpending,
          userNetBalance: userBal ? userBal.netBalance : 0,
          pendingSettlementsCount: balances.simplifiedSettlements.length
        };
      })
    );

    return sendSuccess(res, 200, 'Groups fetched successfully', enrichedGroups);
  } catch (error) {
    next(error);
  }
};

// GET /api/groups/:groupId — Get single group details
const getGroupDetails = async (req, res, next) => {
  try {
    const group = req.group;
    const balances = await calculateGroupBalances(group._id);

    const userEntry = group.members.find(
      (m) => m.userId && m.userId._id.toString() === req.user._id.toString()
    );

    return sendSuccess(res, 200, 'Group details fetched', {
      group,
      userRole: userEntry ? userEntry.role : 'member',
      memberCount: group.members.length,
      balances
    });
  } catch (error) {
    next(error);
  }
};

// PATCH / PUT /api/groups/:groupId — Update group metadata (owner/admin only)
const updateGroup = async (req, res, next) => {
  try {
    const { name, description, category, currency } = req.body;
    const group = req.group;

    if (name !== undefined) {
      if (!name.trim()) {
        return next(new ApiError(400, 'Group name cannot be empty.'));
      }
      if (name.trim().length > 80) {
        return next(new ApiError(400, 'Group name cannot exceed 80 characters.'));
      }
      group.name = name.trim();
    }

    if (description !== undefined) {
      if (description.trim().length > 300) {
        return next(new ApiError(400, 'Description cannot exceed 300 characters.'));
      }
      group.description = description.trim();
    }

    const validCategories = ['Trip', 'Home', 'Event', 'Project', 'Couple', 'Other'];
    if (category && validCategories.includes(category)) {
      group.category = category;
    }

    const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'];
    if (currency && validCurrencies.includes(currency)) {
      group.currency = currency;
    }

    await group.save();

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'GROUP_UPDATED',
      summary: `${req.user.name} updated group details.`
    });

    const updatedGroup = await Group.findById(group._id)
      .populate('members.userId', 'name email avatarUrl defaultCurrency')
      .populate('createdBy', 'name email');

    return sendSuccess(res, 200, 'Group updated successfully', updatedGroup);
  } catch (error) {
    next(error);
  }
};

// POST /api/groups/:groupId/archive — Archive group (owner/admin only)
const archiveGroup = async (req, res, next) => {
  try {
    const group = req.group;

    if (group.isArchived) {
      return next(new ApiError(400, 'Group is already archived.'));
    }

    group.isArchived = true;
    group.archivedAt = new Date();
    group.archivedBy = req.user._id;
    await group.save();

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'GROUP_ARCHIVED',
      summary: `${req.user.name} archived the group.`
    });

    return sendSuccess(res, 200, 'Group archived successfully', group);
  } catch (error) {
    next(error);
  }
};

// POST /api/groups/:groupId/unarchive — Unarchive group (owner/admin only)
const unarchiveGroup = async (req, res, next) => {
  try {
    const group = req.group;

    if (!group.isArchived) {
      return next(new ApiError(400, 'Group is not archived.'));
    }

    group.isArchived = false;
    group.archivedAt = null;
    group.archivedBy = null;
    await group.save();

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'GROUP_UNARCHIVED',
      summary: `${req.user.name} restored the group from archives.`
    });

    return sendSuccess(res, 200, 'Group unarchived successfully', group);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/groups/:groupId — Delete group (owner only)
const deleteGroup = async (req, res, next) => {
  try {
    const group = req.group;

    // Remove associated records safely
    await Expense.deleteMany({ groupId: group._id });
    await Settlement.deleteMany({ groupId: group._id });
    await ActivityLog.deleteMany({ groupId: group._id });
    await Invitation.deleteMany({ groupId: group._id });
    await Group.findByIdAndDelete(group._id);

    return sendSuccess(res, 200, 'Group deleted permanently');
  } catch (error) {
    next(error);
  }
};

/**
 * MODULE 3 — MEMBER MANAGEMENT APIS
 */

// GET /api/groups/:groupId/members — List group members
const getMembers = async (req, res, next) => {
  try {
    const group = req.group;
    return sendSuccess(res, 200, 'Members fetched', group.members);
  } catch (error) {
    next(error);
  }
};

// POST /api/groups/:groupId/members — Add member by email (owner/admin only)
const addMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const group = req.group;

    if (!email || !email.trim()) {
      return next(new ApiError(400, 'Member email is required.'));
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Prevent non-owners from assigning 'owner' role
    const assignedRole = role === 'admin' ? 'admin' : 'member';

    let targetUser = await User.findOne({ email: normalizedEmail });

    // If user does not exist yet, create a registered account for seamless collaboration
    if (!targetUser) {
      const generatedPassword = Math.random().toString(36).slice(-8) + 'A1!';
      const defaultName = normalizedEmail.split('@')[0];
      targetUser = await User.create({
        name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
        email: normalizedEmail,
        password: generatedPassword,
        defaultCurrency: group.currency || 'INR'
      });
    }

    const alreadyMember = group.members.some(
      (m) => m.userId && m.userId._id.toString() === targetUser._id.toString()
    );

    if (alreadyMember) {
      return next(new ApiError(409, 'User is already a member of this group.'));
    }

    group.members.push({
      userId: targetUser._id,
      role: assignedRole,
      joinedAt: new Date()
    });

    await group.save();

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'MEMBER_ADDED',
      targetId: targetUser._id,
      summary: `${req.user.name} added ${targetUser.name} (${targetUser.email}) as a ${assignedRole}.`
    });

    // In-App Notification Trigger
    notificationService.notifyMemberAdded(group, targetUser, req.user).catch((err) => {
      console.error('[GroupController] Member added notification trigger error:', err.message);
    });

    const updatedGroup = await Group.findById(group._id)
      .populate('members.userId', 'name email avatarUrl defaultCurrency')
      .populate('createdBy', 'name email');

    return sendSuccess(res, 200, 'Member added successfully', updatedGroup);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/groups/:groupId/members/:userId/role — Update member role (owner/admin only)
const updateMemberRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const group = req.group;
    const currentCallerRole = req.userMemberRole; // 'owner' | 'admin'

    if (!mongoose.isValidObjectId(userId)) {
      return next(new ApiError(400, 'Invalid User ID.'));
    }

    if (!['owner', 'admin', 'member'].includes(role)) {
      return next(new ApiError(400, 'Invalid role. Must be owner, admin, or member.'));
    }

    const targetMember = group.members.find(
      (m) => m.userId && m.userId._id.toString() === userId
    );

    if (!targetMember) {
      return next(new ApiError(404, 'Member not found in this group.'));
    }

    // Role update hierarchy rules:
    // 1. Only owner can grant or revoke 'owner' role.
    if (role === 'owner' && currentCallerRole !== 'owner') {
      return next(new ApiError(403, 'Only the group owner can transfer or assign ownership.'));
    }

    // 2. Admin cannot modify the role of an owner.
    if (targetMember.role === 'owner' && currentCallerRole !== 'owner') {
      return next(new ApiError(403, 'Administrators cannot alter the owner role.'));
    }

    // 3. Prevent removing the last owner.
    if (targetMember.role === 'owner' && role !== 'owner') {
      const ownerCount = group.members.filter((m) => m.role === 'owner').length;
      if (ownerCount <= 1) {
        return next(
          new ApiError(
            400,
            'Cannot demote the sole owner. Please transfer ownership first.'
          )
        );
      }
    }

    // If making someone owner, transfer ownership if caller is current sole owner
    if (role === 'owner') {
      // Demote current owner to admin if caller is transferring
      if (currentCallerRole === 'owner') {
        const callerMember = group.members.find(
          (m) => m.userId && m.userId._id.toString() === req.user._id.toString()
        );
        if (callerMember && callerMember.userId._id.toString() !== userId) {
          callerMember.role = 'admin';
        }
      }
    }

    targetMember.role = role;
    await group.save();

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'MEMBER_ROLE_UPDATED',
      targetId: targetMember.userId._id,
      summary: `${req.user.name} changed ${targetMember.userId.name}'s role to ${role}.`
    });

    const updatedGroup = await Group.findById(group._id)
      .populate('members.userId', 'name email avatarUrl defaultCurrency')
      .populate('createdBy', 'name email');

    return sendSuccess(res, 200, 'Member role updated successfully', updatedGroup);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/groups/:groupId/members/:userId — Remove a member (owner/admin only, or self-remove)
const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const group = req.group;
    const currentCallerRole = req.userMemberRole;

    if (!mongoose.isValidObjectId(userId)) {
      return next(new ApiError(400, 'Invalid User ID.'));
    }

    const targetMember = group.members.find(
      (m) => m.userId && m.userId._id.toString() === userId
    );

    if (!targetMember) {
      return next(new ApiError(404, 'Member not found in this group.'));
    }

    // Disallow non-owners from removing an owner
    if (targetMember.role === 'owner' && currentCallerRole !== 'owner') {
      return next(new ApiError(403, 'Administrators cannot remove the group owner.'));
    }

    // Disallow removing the sole owner
    if (targetMember.role === 'owner') {
      const ownerCount = group.members.filter((m) => m.role === 'owner').length;
      if (ownerCount <= 1) {
        return next(
          new ApiError(
            400,
            'Cannot remove the sole owner. Transfer ownership before leaving or deleting group.'
          )
        );
      }
    }

    // Check financial balance integrity
    const balances = await calculateGroupBalances(group._id);
    const memberBal = balances.memberBalances.find((m) => m.userId === userId);

    if (memberBal && Math.abs(memberBal.netBalance) > 0) {
      return next(
        new ApiError(
          400,
          `Cannot remove member with unsettled balance (${(memberBal.netBalance / 100).toFixed(
            2
          )} ${group.currency}). All debts must be settled first.`
        )
      );
    }

    group.members = group.members.filter(
      (m) => m.userId && m.userId._id.toString() !== userId
    );

    await group.save();

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'MEMBER_REMOVED',
      summary: `${req.user.name} removed ${targetMember.userId.name} from the group.`
    });

    const updatedGroup = await Group.findById(group._id)
      .populate('members.userId', 'name email avatarUrl defaultCurrency')
      .populate('createdBy', 'name email');

    return sendSuccess(res, 200, 'Member removed successfully', updatedGroup);
  } catch (error) {
    next(error);
  }
};

// POST /api/groups/:groupId/leave — Authenticated user leaves the group
const leaveGroup = async (req, res, next) => {
  try {
    const group = req.group;
    const userId = req.user._id.toString();

    const targetMember = group.members.find(
      (m) => m.userId && m.userId._id.toString() === userId
    );

    if (!targetMember) {
      return next(new ApiError(404, 'You are not a member of this group.'));
    }

    // Disallow sole owner from leaving without transferring ownership
    if (targetMember.role === 'owner') {
      const ownerCount = group.members.filter((m) => m.role === 'owner').length;
      if (ownerCount <= 1) {
        return next(
          new ApiError(
            400,
            'You are the sole owner of this group. Please transfer ownership to another member before leaving.'
          )
        );
      }
    }

    // Check financial balance integrity
    const balances = await calculateGroupBalances(group._id);
    const memberBal = balances.memberBalances.find((m) => m.userId === userId);

    if (memberBal && Math.abs(memberBal.netBalance) > 0) {
      return next(
        new ApiError(
          400,
          `You have an unsettled balance of ${(memberBal.netBalance / 100).toFixed(
            2
          )} ${group.currency}. Please settle your balances before leaving the group.`
        )
      );
    }

    group.members = group.members.filter(
      (m) => m.userId && m.userId._id.toString() !== userId
    );

    await group.save();

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'MEMBER_LEFT',
      summary: `${req.user.name} left the group.`
    });

    return sendSuccess(res, 200, 'You have left the group successfully');
  } catch (error) {
    next(error);
  }
};

// POST /api/groups/:groupId/transfer-ownership — Owner transfers ownership to another member
const transferOwnership = async (req, res, next) => {
  try {
    const { newOwnerId } = req.body;
    const group = req.group;

    if (!newOwnerId || !mongoose.isValidObjectId(newOwnerId)) {
      return next(new ApiError(400, 'Valid new owner ID is required.'));
    }

    if (newOwnerId === req.user._id.toString()) {
      return next(new ApiError(400, 'You are already the owner of this group.'));
    }

    const newOwnerMember = group.members.find(
      (m) => m.userId && m.userId._id.toString() === newOwnerId
    );

    if (!newOwnerMember) {
      return next(new ApiError(404, 'New owner must be an existing group member.'));
    }

    const currentOwnerMember = group.members.find(
      (m) => m.userId && m.userId._id.toString() === req.user._id.toString()
    );

    if (currentOwnerMember) {
      currentOwnerMember.role = 'admin';
    }

    newOwnerMember.role = 'owner';
    await group.save();

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'OWNERSHIP_TRANSFERRED',
      targetId: newOwnerMember.userId._id,
      summary: `${req.user.name} transferred group ownership to ${newOwnerMember.userId.name}.`
    });

    const updatedGroup = await Group.findById(group._id)
      .populate('members.userId', 'name email avatarUrl defaultCurrency')
      .populate('createdBy', 'name email');

    return sendSuccess(res, 200, 'Ownership transferred successfully', updatedGroup);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
