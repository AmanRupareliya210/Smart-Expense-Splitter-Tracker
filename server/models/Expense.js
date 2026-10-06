const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number, // Stored in integer cents/paise
      required: true,
      min: [0, 'Split amount cannot be negative']
    },
    percentage: {
      type: Number,
      default: null
    },
    shares: {
      type: Number,
      default: null
    }
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Expense description/title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    totalAmount: {
      type: Number, // Stored in integer cents/paise
      required: [true, 'Total amount is required'],
      min: [1, 'Amount must be greater than 0'],
      validate: {
        validator: Number.isInteger,
        message: 'Total amount must be an integer in minor currency units (cents)'
      }
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    splitType: {
      type: String,
      enum: ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'],
      default: 'EQUAL'
    },
    splits: {
      type: [splitSchema],
      validate: [
        {
          validator: function (splits) {
            return splits && splits.length > 0;
          },
          message: 'Expense must have at least one split participant'
        },
        {
          validator: function (splits) {
            const userIds = splits.map((s) => s.userId.toString());
            return new Set(userIds).size === userIds.length;
          },
          message: 'Duplicate split participants are not permitted'
        },
        {
          validator: function (splits) {
            const sum = splits.reduce((acc, s) => acc + s.amount, 0);
            return sum === this.totalAmount;
          },
          message: 'Sum of split participant amounts must exactly equal the total expense amount'
        }
      ]
    },
    category: {
      type: String,
      enum: [
        'Food',
        'Transportation',
        'Accommodation',
        'Entertainment',
        'Utilities',
        'Groceries',
        'General',
        'Other'
      ],
      default: 'General'
    },
    expenseDate: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Performance & Filtering Indexes
expenseSchema.index({ groupId: 1, expenseDate: -1 });
expenseSchema.index({ groupId: 1, category: 1 });
expenseSchema.index({ paidBy: 1 });
expenseSchema.index({ 'splits.userId': 1 });

module.exports = mongoose.model('Expense', expenseSchema);
