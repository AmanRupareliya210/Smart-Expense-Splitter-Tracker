const express = require('express');
const router = express.Router();
const {
  getInvitationPreview,
  acceptInvitation
} = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');

// Public preview of invitation link (minimal info, no sensitive group data)
router.get('/:token', getInvitationPreview);

// Accept invitation (requires authenticated user)
router.post('/:token/accept', protect, acceptInvitation);

module.exports = router;
