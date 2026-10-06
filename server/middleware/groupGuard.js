const mongoose = require('mongoose');
const Group = require('../models/Group');
const ApiError = require('../utils/apiError');

/**
 * Middleware to ensure the authenticated user is a verified member of the requested group
 */
const ensureGroupMember = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.body.groupId;

    if (!groupId) {
      return next(new ApiError(400, 'Group ID is required.'));
    }

    if (!mongoose.isValidObjectId(groupId)) {
      return next(new ApiError(400, 'Invalid Group ID format.'));
    }

    const group = await Group.findById(groupId)
      .populate('members.userId', 'name email avatarUrl defaultCurrency')
      .populate('createdBy', 'name email')
      .populate('archivedBy', 'name email');

    if (!group) {
      return next(new ApiError(404, 'Group not found.'));
    }

    const memberEntry = group.members.find(
      (m) => m.userId && m.userId._id.toString() === req.user._id.toString()
    );

    if (!memberEntry) {
      return next(new ApiError(403, 'Access denied. You are not a member of this group.'));
    }

    req.group = group;
    req.userMemberRole = memberEntry.role; // 'owner' | 'admin' | 'member'
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to ensure the authenticated user is an admin or owner of the requested group
 */
const ensureGroupAdmin = async (req, res, next) => {
  try {
    const group = req.group;
    if (!group) {
      return next(new ApiError(400, 'Group context not loaded.'));
    }

    const memberEntry = group.members.find(
      (m) => m.userId && m.userId._id.toString() === req.user._id.toString()
    );

    if (!memberEntry || (memberEntry.role !== 'admin' && memberEntry.role !== 'owner')) {
      return next(new ApiError(403, 'Action requires group administrator or owner privileges.'));
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to ensure the authenticated user is the owner of the requested group
 */
const ensureGroupOwner = async (req, res, next) => {
  try {
    const group = req.group;
    if (!group) {
      return next(new ApiError(400, 'Group context not loaded.'));
    }

    const memberEntry = group.members.find(
      (m) => m.userId && m.userId._id.toString() === req.user._id.toString()
    );

    if (!memberEntry || memberEntry.role !== 'owner') {
      return next(new ApiError(403, 'Action requires group owner privileges.'));
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  ensureGroupMember,
  ensureGroupAdmin,
  ensureGroupOwner
};
