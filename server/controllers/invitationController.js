const crypto = require('crypto');
const mongoose = require('mongoose');
const Invitation = require('../models/Invitation');
const Group = require('../models/Group');
const ActivityLog = require('../models/ActivityLog');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const notificationService = require('../services/notificationService');

// Helper to hash raw tokens with SHA-256
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * MODULE 4 — SECURE INVITATION SYSTEM
 */

// POST /api/groups/:groupId/invitations — Generate a new cryptographically secure invite link
const createInvitation = async (req, res, next) => {
  try {
    const { email, role, expiresInDays } = req.body;
    const group = req.group;

    const assignedRole = role === 'admin' ? 'admin' : 'member';
    const days = expiresInDays && Number.isInteger(expiresInDays) && expiresInDays > 0 ? expiresInDays : 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Generate 32-byte cryptographically secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    const invitation = await Invitation.create({
      groupId: group._id,
      invitedBy: req.user._id,
      email: email ? email.trim().toLowerCase() : '',
      tokenHash,
      role: assignedRole,
      expiresAt,
      status: 'pending'
    });

    const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const inviteUrl = `${clientBaseUrl}/join/${rawToken}`;

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'INVITATION_CREATED',
      summary: `${req.user.name} generated an invite link for group "${group.name}".`
    });

    return sendSuccess(res, 201, 'Invitation generated successfully', {
      invitationId: invitation._id,
      inviteUrl,
      token: rawToken,
      expiresAt: invitation.expiresAt,
      role: invitation.role,
      email: invitation.email
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/groups/:groupId/invitations — List all pending invitations for a group
const getGroupInvitations = async (req, res, next) => {
  try {
    const group = req.group;

    const invitations = await Invitation.find({
      groupId: group._id,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
      .populate('invitedBy', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Group invitations fetched', invitations);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/groups/:groupId/invitations/:invitationId — Revoke an invitation link
const revokeInvitation = async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const group = req.group;

    if (!mongoose.isValidObjectId(invitationId)) {
      return next(new ApiError(400, 'Invalid Invitation ID.'));
    }

    const invitation = await Invitation.findOne({
      _id: invitationId,
      groupId: group._id
    });

    if (!invitation) {
      return next(new ApiError(404, 'Invitation not found.'));
    }

    if (invitation.status === 'revoked') {
      return next(new ApiError(400, 'Invitation is already revoked.'));
    }

    invitation.status = 'revoked';
    invitation.revokedAt = new Date();
    invitation.revokedBy = req.user._id;
    await invitation.save();

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'INVITATION_REVOKED',
      summary: `${req.user.name} revoked an invitation link.`
    });

    return sendSuccess(res, 200, 'Invitation revoked successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/invitations/:token — Public invitation preview (safe minimal details)
const getInvitationPreview = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 16) {
      return next(new ApiError(400, 'Invalid invitation token format.'));
    }

    const tokenHash = hashToken(token);
    const invitation = await Invitation.findOne({ tokenHash })
      .populate('groupId', 'name description category currency members')
      .populate('invitedBy', 'name avatarUrl');

    if (!invitation) {
      return next(new ApiError(404, 'Invitation link not found or invalid.'));
    }

    const isExpired = new Date() > new Date(invitation.expiresAt);
    const isRevoked = invitation.status === 'revoked';
    const isAccepted = invitation.status === 'accepted';
    const isValid = invitation.status === 'pending' && !isExpired;

    return sendSuccess(res, 200, 'Invitation preview', {
      isValid,
      status: isExpired ? 'expired' : invitation.status,
      group: {
        id: invitation.groupId._id,
        name: invitation.groupId.name,
        description: invitation.groupId.description,
        category: invitation.groupId.category,
        currency: invitation.groupId.currency,
        memberCount: invitation.groupId.members ? invitation.groupId.members.length : 0
      },
      invitedBy: {
        name: invitation.invitedBy ? invitation.invitedBy.name : 'A member',
        avatarUrl: invitation.invitedBy ? invitation.invitedBy.avatarUrl : ''
      },
      targetEmail: invitation.email || null,
      role: invitation.role,
      expiresAt: invitation.expiresAt
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/invitations/:token/accept — Authenticated user accepts the invitation
const acceptInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user._id;

    if (!token || token.length < 16) {
      return next(new ApiError(400, 'Invalid invitation token.'));
    }

    const tokenHash = hashToken(token);
    const invitation = await Invitation.findOne({ tokenHash }).populate('groupId');

    if (!invitation) {
      return next(new ApiError(404, 'Invitation not found or invalid.'));
    }

    if (invitation.status === 'revoked') {
      return next(new ApiError(400, 'This invitation link has been revoked by an administrator.'));
    }

    if (new Date() > new Date(invitation.expiresAt) || invitation.status === 'expired') {
      invitation.status = 'expired';
      await invitation.save();
      return next(new ApiError(400, 'This invitation link has expired.'));
    }

    const group = await Group.findById(invitation.groupId._id);
    if (!group) {
      return next(new ApiError(404, 'The associated group no longer exists.'));
    }

    // Check if user is already a member
    const alreadyMember = group.members.some(
      (m) => m.userId && m.userId.toString() === userId.toString()
    );

    if (alreadyMember) {
      return sendSuccess(res, 200, 'You are already a member of this group.', {
        group: {
          id: group._id,
          name: group.name
        },
        alreadyMember: true
      });
    }

    // Add user as member with the role specified by the invitation
    group.members.push({
      userId: userId,
      role: invitation.role || 'member',
      joinedAt: new Date()
    });

    await group.save();

    // Mark invitation as accepted if target email was specified, or keep available if general multi-use
    invitation.status = 'accepted';
    invitation.acceptedBy = userId;
    invitation.acceptedAt = new Date();
    await invitation.save();

    await ActivityLog.create({
      groupId: group._id,
      performedBy: userId,
      action: 'INVITATION_ACCEPTED',
      summary: `${req.user.name} joined the group via invite link.`
    });

    // In-App Notification Trigger
    notificationService.notifyMemberAdded(group, req.user, invitation.invitedBy).catch((err) => {
      console.error('[InvitationController] Notification trigger error:', err.message);
    });

    return sendSuccess(res, 200, `Welcome! You have joined "${group.name}".`, {
      group: {
        id: group._id,
        name: group.name,
        category: group.category
      },
      joinedRole: invitation.role || 'member'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInvitation,
  getGroupInvitations,
  revokeInvitation,
  getInvitationPreview,
  acceptInvitation
};
