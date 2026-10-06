const Notification = require('../models/Notification');
const { toDecimal } = require('./splitEngine');

/**
 * Service handling creation, dispatch and triggers for in-app notifications
 */
const notificationService = {
  /**
   * Create a single notification safely without breaking parent transaction/controller
   */
  async createNotification(payload) {
    try {
      if (!payload.recipient) return null;
      // Do not notify user about actions performed by themselves
      if (
        payload.sender &&
        payload.recipient.toString() === payload.sender.toString() &&
        payload.type !== 'SYSTEM'
      ) {
        return null;
      }

      return await Notification.create(payload);
    } catch (err) {
      console.error('[NotificationService] Failed to create notification:', err.message);
      return null;
    }
  },

  /**
   * Create multiple notifications concurrently
   */
  async createBulkNotifications(notificationsArray) {
    try {
      if (!Array.isArray(notificationsArray) || notificationsArray.length === 0) return [];
      
      const validNotifications = notificationsArray.filter((n) => {
        if (!n.recipient) return false;
        if (n.sender && n.recipient.toString() === n.sender.toString() && n.type !== 'SYSTEM') {
          return false;
        }
        return true;
      });

      if (validNotifications.length === 0) return [];

      return await Notification.insertMany(validNotifications, { ordered: false });
    } catch (err) {
      console.error('[NotificationService] Failed to insert bulk notifications:', err.message);
      return [];
    }
  },

  /**
   * Trigger: New expense created -> Notify all participants in the split (except payer)
   */
  async notifyExpenseCreated(expense, payerUser, group) {
    try {
      const payerName = payerUser?.name || 'A member';
      const groupName = group?.name || 'your group';
      const formattedAmount = `${expense.currency || 'INR'} ${toDecimal(expense.totalAmount)}`;

      const notifications = [];
      const seenRecipients = new Set();

      for (const split of expense.splits || []) {
        const participantId = (split.userId?._id || split.userId).toString();
        const payerId = (payerUser?._id || expense.paidBy).toString();

        if (participantId !== payerId && !seenRecipients.has(participantId)) {
          seenRecipients.add(participantId);
          const splitAmount = `${expense.currency || 'INR'} ${toDecimal(split.amount)}`;

          notifications.push({
            recipient: participantId,
            sender: payerId,
            type: 'EXPENSE_ADDED',
            title: `New Expense in ${groupName}`,
            message: `${payerName} added "${expense.title}" (${formattedAmount}). Your share is ${splitAmount}.`,
            groupId: group?._id || expense.groupId,
            relatedEntityId: expense._id,
            entityType: 'Expense',
            metadata: {
              expenseId: expense._id,
              totalAmount: expense.totalAmount,
              userShare: split.amount,
              currency: expense.currency
            }
          });
        }
      }

      await this.createBulkNotifications(notifications);
    } catch (err) {
      console.error('[NotificationService] notifyExpenseCreated error:', err.message);
    }
  },

  /**
   * Trigger: Expense updated -> Notify participants
   */
  async notifyExpenseUpdated(expense, editorUser, group) {
    try {
      const editorName = editorUser?.name || 'A member';
      const groupName = group?.name || 'your group';

      const notifications = [];
      const seenRecipients = new Set();
      const editorId = (editorUser?._id || editorUser).toString();

      for (const split of expense.splits || []) {
        const participantId = (split.userId?._id || split.userId).toString();

        if (participantId !== editorId && !seenRecipients.has(participantId)) {
          seenRecipients.add(participantId);
          notifications.push({
            recipient: participantId,
            sender: editorId,
            type: 'EXPENSE_UPDATED',
            title: `Expense Updated in ${groupName}`,
            message: `${editorName} updated "${expense.title}".`,
            groupId: group?._id || expense.groupId,
            relatedEntityId: expense._id,
            entityType: 'Expense',
            metadata: {
              expenseId: expense._id,
              totalAmount: expense.totalAmount,
              currency: expense.currency
            }
          });
        }
      }

      await this.createBulkNotifications(notifications);
    } catch (err) {
      console.error('[NotificationService] notifyExpenseUpdated error:', err.message);
    }
  },

  /**
   * Trigger: Expense deleted -> Notify group participants
   */
  async notifyExpenseDeleted(expense, deleterUser, group) {
    try {
      const deleterName = deleterUser?.name || 'A member';
      const groupName = group?.name || 'your group';
      const deleterId = (deleterUser?._id || deleterUser).toString();

      const notifications = [];
      const seenRecipients = new Set();

      for (const split of expense.splits || []) {
        const participantId = (split.userId?._id || split.userId).toString();

        if (participantId !== deleterId && !seenRecipients.has(participantId)) {
          seenRecipients.add(participantId);
          notifications.push({
            recipient: participantId,
            sender: deleterId,
            type: 'EXPENSE_DELETED',
            title: `Expense Removed from ${groupName}`,
            message: `${deleterName} deleted the expense "${expense.title}".`,
            groupId: group?._id || expense.groupId,
            relatedEntityId: expense._id,
            entityType: 'Expense',
            metadata: {
              expenseId: expense._id,
              title: expense.title
            }
          });
        }
      }

      await this.createBulkNotifications(notifications);
    } catch (err) {
      console.error('[NotificationService] notifyExpenseDeleted error:', err.message);
    }
  },

  /**
   * Trigger: Settlement recorded -> Notify receiver (paidTo) and payer (if recorded by admin)
   */
  async notifySettlementRecorded(settlement, payerUser, receiverUser, group, recorderId) {
    try {
      const groupName = group?.name || 'your group';
      const payerName = payerUser?.name || 'A member';
      const receiverName = receiverUser?.name || 'A member';
      const formattedAmount = `${settlement.currency || 'INR'} ${toDecimal(settlement.amount)}`;

      const payerId = (payerUser?._id || settlement.paidBy).toString();
      const receiverId = (receiverUser?._id || settlement.paidTo).toString();
      const senderId = (recorderId || payerId).toString();

      // Notify the receiver
      if (receiverId !== senderId) {
        await this.createNotification({
          recipient: receiverId,
          sender: senderId,
          type: 'SETTLEMENT_RECORDED',
          title: `Payment Received in ${groupName}`,
          message: `${payerName} recorded a payment of ${formattedAmount} to you via ${settlement.paymentMethod || 'DIRECT_TRANSFER'}.`,
          groupId: group?._id || settlement.groupId,
          relatedEntityId: settlement._id,
          entityType: 'Settlement',
          metadata: {
            settlementId: settlement._id,
            amount: settlement.amount,
            currency: settlement.currency,
            payerId,
            receiverId
          }
        });
      }

      // If third-party recorded (e.g. admin), also notify payer
      if (payerId !== senderId) {
        await this.createNotification({
          recipient: payerId,
          sender: senderId,
          type: 'SETTLEMENT_RECORDED',
          title: `Settlement Logged in ${groupName}`,
          message: `A payment of ${formattedAmount} to ${receiverName} was recorded for you.`,
          groupId: group?._id || settlement.groupId,
          relatedEntityId: settlement._id,
          entityType: 'Settlement',
          metadata: {
            settlementId: settlement._id,
            amount: settlement.amount,
            currency: settlement.currency
          }
        });
      }
    } catch (err) {
      console.error('[NotificationService] notifySettlementRecorded error:', err.message);
    }
  },

  /**
   * Trigger: Settlement reversed -> Notify both parties
   */
  async notifySettlementReversed(settlement, reverserUser, group) {
    try {
      const groupName = group?.name || 'your group';
      const reverserName = reverserUser?.name || 'An admin';
      const formattedAmount = `${settlement.currency || 'INR'} ${toDecimal(settlement.amount)}`;
      const reverserId = (reverserUser?._id || reverserUser).toString();

      const payerId = (settlement.paidBy?._id || settlement.paidBy).toString();
      const receiverId = (settlement.paidTo?._id || settlement.paidTo).toString();

      const recipients = [payerId, receiverId].filter((id) => id !== reverserId);

      for (const recId of recipients) {
        await this.createNotification({
          recipient: recId,
          sender: reverserId,
          type: 'SETTLEMENT_REVERSED',
          title: `Settlement Reversed in ${groupName}`,
          message: `${reverserName} reversed the payment of ${formattedAmount}. Group balances have been restored.`,
          groupId: group?._id || settlement.groupId,
          relatedEntityId: settlement._id,
          entityType: 'Settlement',
          metadata: {
            settlementId: settlement._id,
            amount: settlement.amount,
            currency: settlement.currency,
            reversalReason: settlement.reversalReason
          }
        });
      }
    } catch (err) {
      console.error('[NotificationService] notifySettlementReversed error:', err.message);
    }
  },

  /**
   * Trigger: Member added / accepted invitation -> Notify existing members
   */
  async notifyMemberAdded(group, newMemberUser, adderUser) {
    try {
      const newMemberName = newMemberUser?.name || 'A new member';
      const adderName = adderUser?.name || 'A member';
      const groupName = group?.name || 'your group';

      const newMemberId = (newMemberUser?._id || newMemberUser).toString();
      const adderId = (adderUser?._id || adderUser || newMemberId).toString();

      // Welcome notification to new member
      await this.createNotification({
        recipient: newMemberId,
        sender: adderId !== newMemberId ? adderId : null,
        type: 'MEMBER_ADDED',
        title: `Welcome to ${groupName}!`,
        message: adderId !== newMemberId
          ? `${adderName} added you to the group "${groupName}".`
          : `You joined "${groupName}". Start adding expenses!`,
        groupId: group._id,
        relatedEntityId: group._id,
        entityType: 'Group'
      });
    } catch (err) {
      console.error('[NotificationService] notifyMemberAdded error:', err.message);
    }
  },

  /**
   * Trigger: Settlement Reminder -> Notify debtor about pending debt
   */
  async notifySettlementReminder(group, debtorUser, creditorUser, amount, currency, customNote) {
    try {
      const creditorName = creditorUser?.name || 'A friend';
      const groupName = group?.name || 'your group';
      const formattedAmount = `${currency || 'INR'} ${toDecimal(amount)}`;
      const debtorId = (debtorUser?._id || debtorUser).toString();
      const creditorId = (creditorUser?._id || creditorUser).toString();

      const noteText = customNote ? ` Note: "${customNote}"` : '';

      return await this.createNotification({
        recipient: debtorId,
        sender: creditorId,
        type: 'SETTLEMENT_REMINDER',
        title: `Settlement Reminder: ${groupName}`,
        message: `${creditorName} sent a reminder for an outstanding balance of ${formattedAmount} in "${groupName}".${noteText}`,
        groupId: group._id,
        relatedEntityId: group._id,
        entityType: 'Group',
        metadata: {
          amount,
          currency,
          creditorId,
          creditorName,
          customNote: customNote || null,
          remindedAt: new Date()
        }
      });
    } catch (err) {
      console.error('[NotificationService] notifySettlementReminder error:', err.message);
      return null;
    }
  }
};

module.exports = notificationService;
