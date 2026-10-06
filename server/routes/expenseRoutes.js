const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  addExpense,
  getExpenses,
  getExpenseDetails,
  updateExpense,
  deleteExpense
} = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');
const { ensureGroupMember } = require('../middleware/groupGuard');

router.use(protect);
router.use(ensureGroupMember);

router.route('/')
  .post(addExpense)
  .get(getExpenses);

router.route('/:expenseId')
  .get(getExpenseDetails)
  .patch(updateExpense)
  .put(updateExpense)
  .delete(deleteExpense);

module.exports = router;
