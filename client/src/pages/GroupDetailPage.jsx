import React, { useState, useEffect, useCallback } from 'react';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { expenseService } from '../services/expenseService';
import { groupService } from '../services/groupService';
import { formatCurrency, formatDate, getInitials } from '../utils/formatters';
import { CATEGORIES, GROUP_CATEGORIES } from '../utils/constants';

// Modals & Views
import { ExpenseModal } from '../components/expense/ExpenseModal';
import { ExpenseDetailModal } from '../components/expense/ExpenseDetailModal';
import { SettlementModal } from '../components/settlement/SettlementModal';
import { InviteModal } from '../components/group/InviteModal';
import { EditGroupModal } from '../components/group/EditGroupModal';
import { TransferOwnershipModal } from '../components/group/TransferOwnershipModal';
import { DebtMinimizerView } from '../components/settlement/DebtMinimizerView';
import { AnalyticsView } from '../components/analytics/AnalyticsView';
import { ActivityTimeline } from '../components/activity/ActivityTimeline';

import {
  PlusCircle,
  UserPlus,
  Zap,
  PieChart,
  History,
  Receipt,
  ArrowLeft,
  Trash2,
  Edit2,
  IndianRupee,
  Users,
  Shield,
  ShieldCheck,
  Crown,
  Archive,
  RotateCcw,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Search,
  Eye,
  X
} from 'lucide-react';

export const GroupDetailPage = ({ groupId, onBack }) => {
  const { user } = useAuth();
  const { activeGroup, activeUserRole, groupBalances, loadGroupDetails, refreshBalances } = useGroup();

  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'members' | 'debts' | 'analytics' | 'activity'
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedDetailExpense, setSelectedDetailExpense] = useState(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlePayer, setSettlePayer] = useState(null);
  const [settleReceiver, setSettleReceiver] = useState(null);
  const [settleAmount, setSettleAmount] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // UI state
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchExpenses = useCallback(async () => {
    try {
      setLoadingExpenses(true);
      const params = {};
      if (expenseCategoryFilter) params.category = expenseCategoryFilter;
      if (expenseSearch) params.search = expenseSearch;
      const res = await expenseService.getExpenses(groupId, params);
      setExpenses(res.expenses || []);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoadingExpenses(false);
    }
  }, [groupId, expenseCategoryFilter, expenseSearch]);

  useEffect(() => {
    if (groupId) {
      loadGroupDetails(groupId);
    }
  }, [groupId, loadGroupDetails]);

  useEffect(() => {
    if (groupId) {
      fetchExpenses();
    }
  }, [groupId, fetchExpenses]);

  const handleExpenseSaved = async () => {
    await fetchExpenses();
    await refreshBalances(groupId);
  };

  const handleSettlementRecorded = async () => {
    await refreshBalances(groupId);
    await fetchExpenses();
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await expenseService.deleteExpense(groupId, expenseId);
      await fetchExpenses();
      await refreshBalances(groupId);
    } catch (err) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const handleOpenSettle = (fromId, toId, amount) => {
    setSettlePayer(fromId);
    setSettleReceiver(toId);
    setSettleAmount(amount);
    setIsSettlementModalOpen(true);
  };

  // Group Archival
  const handleArchiveToggle = async () => {
    const isArchived = activeGroup?.isArchived;
    const confirmMsg = isArchived
      ? 'Restore this group from archives to active status?'
      : 'Archive this group? It will be hidden from the active dashboard.';
    if (!window.confirm(confirmMsg)) return;

    try {
      setActionError('');
      if (isArchived) {
        await groupService.unarchiveGroup(groupId);
        setActionSuccess('Group restored successfully.');
      } else {
        await groupService.archiveGroup(groupId);
        setActionSuccess('Group archived successfully.');
      }
      await loadGroupDetails(groupId);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      setActionError(err.message || 'Failed to update group archive state.');
    }
  };

  // Delete Group
  const handleDeleteGroup = async () => {
    if (
      !window.confirm(
        '⚠️ PERMANENT ACTION: Are you sure you want to delete this group? All associated expenses, settlements, and history will be permanently deleted.'
      )
    )
      return;

    try {
      await groupService.deleteGroup(groupId);
      onBack();
    } catch (err) {
      setActionError(err.message || 'Failed to delete group');
    }
  };

  // Member Management Actions
  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      setActionError('');
      await groupService.updateMemberRole(groupId, targetUserId, newRole);
      setActionSuccess('Member role updated.');
      await loadGroupDetails(groupId);
      setTimeout(() => setActionSuccess(''), 2500);
    } catch (err) {
      setActionError(err.message || 'Failed to update member role.');
    }
  };

  const handleRemoveMember = async (targetUserId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this group?`)) return;
    try {
      setActionError('');
      await groupService.removeMember(groupId, targetUserId);
      setActionSuccess(`${memberName} was removed from the group.`);
      await loadGroupDetails(groupId);
      setTimeout(() => setActionSuccess(''), 2500);
    } catch (err) {
      setActionError(err.message || 'Failed to remove member.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      setActionError('');
      await groupService.leaveGroup(groupId);
      onBack();
    } catch (err) {
      setActionError(err.message || 'Failed to leave group.');
    }
  };

  if (!activeGroup) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading group details...
      </div>
    );
  }

  const catDef = GROUP_CATEGORIES.find((c) => c.id === activeGroup.category) || {
    emoji: '📂',
    label: 'Other'
  };
  const currency = activeGroup.currency || 'INR';
  const totalSpending = groupBalances?.totalSpending || 0;
  const isOwner = activeUserRole === 'owner';
  const isAdmin = activeUserRole === 'admin' || isOwner;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header & Navigation */}
      <div>
        <button
          onClick={onBack}
          className="btn btn-sm btn-ghost"
          style={{
            marginBottom: '1rem',
            paddingLeft: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        {/* Global Feedback Banners */}
        {actionError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-rose)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError('')}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-emerald)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess('')}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.85rem'
                }}
              >
                {catDef.emoji}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{activeGroup.name}</h1>
                  <span className="badge badge-indigo">{catDef.label}</span>
                  {activeGroup.isArchived && (
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(156, 163, 175, 0.2)',
                        color: 'var(--text-muted)',
                        border: '1px solid rgba(156, 163, 175, 0.3)'
                      }}
                    >
                      Archived
                    </span>
                  )}
                  {isOwner ? (
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: 'var(--accent-amber)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Crown size={12} /> You are Owner
                    </span>
                  ) : isAdmin ? (
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(99, 102, 241, 0.2)',
                        color: 'var(--accent-primary-light)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <ShieldCheck size={12} /> You are Admin
                    </span>
                  ) : null}
                </div>

                {activeGroup.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                    {activeGroup.description}
                  </p>
                )}

                {/* Quick Action Toolbar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.65rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="btn btn-sm btn-ghost"
                    style={{
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.78rem',
                      color: 'var(--accent-primary)'
                    }}
                  >
                    <UserPlus size={14} />
                    <span>Invite Members</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="btn btn-sm btn-ghost"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                    >
                      <Edit2 size={14} />
                      <span>Edit Settings</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={handleArchiveToggle}
                      className="btn btn-sm btn-ghost"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                    >
                      {activeGroup.isArchived ? <RotateCcw size={14} /> : <Archive size={14} />}
                      <span>{activeGroup.isArchived ? 'Unarchive' : 'Archive'}</span>
                    </button>
                  )}

                  {isOwner && (
                    <button
                      onClick={() => setIsTransferModalOpen(true)}
                      className="btn btn-sm btn-ghost"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', color: 'var(--accent-amber)' }}
                    >
                      <Crown size={14} />
                      <span>Transfer Ownership</span>
                    </button>
                  )}

                  {!isOwner && (
                    <button
                      onClick={handleLeaveGroup}
                      className="btn btn-sm btn-ghost"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', color: 'var(--accent-rose)' }}
                    >
                      <LogOut size={14} />
                      <span>Leave Group</span>
                    </button>
                  )}

                  {isOwner && (
                    <button
                      onClick={handleDeleteGroup}
                      className="btn btn-sm btn-ghost"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', color: 'var(--accent-rose)' }}
                    >
                      <Trash2 size={14} />
                      <span>Delete Group</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Total Spend & Fast Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  textAlign: 'right',
                  paddingRight: '1rem',
                  borderRight: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Group Spend</div>
                <div
                  className="font-mono"
                  style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}
                >
                  {formatCurrency(totalSpending, currency)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleOpenSettle(null, null, null)}
                  className="btn btn-emerald"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <IndianRupee size={16} />
                  <span>Settle Up</span>
                </button>

                <button
                  onClick={() => {
                    setEditingExpense(null);
                    setIsExpenseModalOpen(true);
                  }}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <PlusCircle size={16} />
                  <span>Add Expense</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
              marginTop: '1.5rem',
              paddingTop: '1rem',
              overflowX: 'auto'
            }}
          >
            <button
              onClick={() => setActiveTab('expenses')}
              className={`btn btn-sm ${activeTab === 'expenses' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Receipt size={16} />
              <span>Expenses ({expenses.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`btn btn-sm ${activeTab === 'members' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Users size={16} />
              <span>Members ({activeGroup.members?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('debts')}
              className={`btn btn-sm ${activeTab === 'debts' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Zap size={16} />
              <span>Balances & Minimizer</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`btn btn-sm ${activeTab === 'analytics' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <PieChart size={16} />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`btn btn-sm ${activeTab === 'activity' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <History size={16} />
              <span>Activity Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: EXPENSES */}
      {activeTab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search & Filter Bar */}
          <div
            className="glass-card"
            style={{
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '220px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Search expenses by title or note..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '2.25rem', fontSize: '0.875rem', height: '38px', width: '100%' }}
                />
                {expenseSearch && (
                  <button
                    onClick={() => setExpenseSearch('')}
                    style={{
                      position: 'absolute',
                      right: '0.65rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="input"
                style={{ width: 'auto', fontSize: '0.875rem', height: '38px', cursor: 'pointer' }}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setEditingExpense(null);
                setIsExpenseModalOpen(true);
              }}
              className="btn btn-sm btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '38px' }}
            >
              <PlusCircle size={16} />
              <span>Add Expense</span>
            </button>
          </div>

          {loadingExpenses ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading expenses...
            </div>
          ) : expenses.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto'
                }}
              >
                <Receipt size={30} color="var(--accent-primary)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {expenseSearch || expenseCategoryFilter ? 'No matching expenses found' : 'No expenses logged yet'}
              </h3>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '420px',
                  margin: '0 auto 1.5rem auto',
                  fontSize: '0.9rem'
                }}
              >
                {expenseSearch || expenseCategoryFilter
                  ? 'Try clearing your search query or category filter.'
                  : 'Add your first group expense to start tracking splits and balances!'}
              </p>
              {expenseSearch || expenseCategoryFilter ? (
                <button
                  onClick={() => {
                    setExpenseSearch('');
                    setExpenseCategoryFilter('');
                  }}
                  className="btn btn-ghost"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingExpense(null);
                    setIsExpenseModalOpen(true);
                  }}
                  className="btn btn-primary"
                >
                  <PlusCircle size={18} />
                  <span>Add First Expense</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {expenses.map((expense) => {
                const catInfo =
                  CATEGORIES.find((c) => c.id === expense.category) || {
                    label: expense.category,
                    color: '#6366f1'
                  };
                const userSplit = expense.splits?.find(
                  (s) => (s.userId?._id || s.userId) === user?.id
                );

                const payerId = expense.paidBy?._id || expense.paidBy;
                const creatorId = expense.createdBy?._id || expense.createdBy;
                const canModifyExpense =
                  (creatorId === user?.id || payerId === user?.id || isAdmin) &&
                  !activeGroup?.isArchived;

                return (
                  <div
                    key={expense._id}
                    className="glass-card glass-card-interactive"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.15rem 1.35rem',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedDetailExpense(expense)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '220px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: `${catInfo.color}20`,
                          border: `1px solid ${catInfo.color}40`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>💳</span>
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          {expense.title}
                          {expense.isEdited && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                color: 'var(--accent-amber)',
                                background: 'rgba(245, 158, 11, 0.15)',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                marginLeft: '0.4rem',
                                fontWeight: 600
                              }}
                            >
                              edited
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            marginTop: '0.2rem'
                          }}
                        >
                          <span>Paid by <strong>{expense.paidBy?.name || 'Member'}</strong></span>
                          <span>•</span>
                          <span>{formatDate(expense.expenseDate)}</span>
                          <span>•</span>
                          <span
                            className="badge badge-indigo"
                            style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', textTransform: 'capitalize' }}
                          >
                            {expense.splitType}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {userSplit ? (
                        <div>
                          Your share:{' '}
                          <span className="font-mono text-emerald" style={{ fontWeight: 600 }}>
                            {formatCurrency(userSplit.amount, currency)}
                          </span>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)' }}>Not involved in split</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          className="font-mono"
                          style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}
                        >
                          {formatCurrency(expense.totalAmount, currency)}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          {expense.splits?.length} participants
                        </div>
                      </div>

                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setSelectedDetailExpense(expense)}
                          className="btn btn-sm btn-ghost"
                          style={{ padding: '0.4rem', borderRadius: '8px' }}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {canModifyExpense && (
                          <>
                            <button
                              onClick={() => {
                                setEditingExpense(expense);
                                setIsExpenseModalOpen(true);
                              }}
                              className="btn btn-sm btn-ghost"
                              style={{ padding: '0.4rem', borderRadius: '8px' }}
                              title="Edit Expense"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense._id)}
                              className="btn btn-sm btn-ghost"
                              style={{ padding: '0.4rem', borderRadius: '8px', color: 'var(--accent-rose)' }}
                              title="Delete Expense"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MEMBERS MANAGEMENT */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem'
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Group Roster & Roles</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Manage member permissions, roles, and invitations
              </p>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <UserPlus size={16} />
              <span>Invite New Member</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeGroup.members?.map((m) => {
              const memberId = m.userId?._id?.toString() || m.userId?.toString();
              const isCurrentUser = memberId === user?.id;
              const isMemberOwner = m.role === 'owner';
              const isMemberAdmin = m.role === 'admin';

              return (
                <div
                  key={memberId}
                  className="glass-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: isMemberOwner
                          ? 'rgba(245, 158, 11, 0.2)'
                          : isMemberAdmin
                          ? 'rgba(99, 102, 241, 0.2)'
                          : 'var(--bg-glass)',
                        border: `1px solid ${
                          isMemberOwner
                            ? 'rgba(245, 158, 11, 0.4)'
                            : isMemberAdmin
                            ? 'rgba(99, 102, 241, 0.4)'
                            : 'var(--border-subtle)'
                        }`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: isMemberOwner
                          ? 'var(--accent-amber)'
                          : isMemberAdmin
                          ? 'var(--accent-primary)'
                          : 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}
                    >
                      {getInitials(m.userId?.name || 'User')}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {m.userId?.name}
                        </span>
                        {isCurrentUser && (
                          <span
                            className="badge badge-indigo"
                            style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}
                          >
                            You
                          </span>
                        )}
                        {isMemberOwner ? (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(245, 158, 11, 0.2)',
                              color: 'var(--accent-amber)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              fontSize: '0.7rem'
                            }}
                          >
                            <Crown size={10} style={{ marginRight: '3px' }} /> Owner
                          </span>
                        ) : isMemberAdmin ? (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(99, 102, 241, 0.2)',
                              color: 'var(--accent-primary-light)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              fontSize: '0.7rem'
                            }}
                          >
                            <ShieldCheck size={10} style={{ marginRight: '3px' }} /> Admin
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              color: 'var(--text-muted)',
                              fontSize: '0.7rem'
                            }}
                          >
                            Member
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {m.userId?.email} • Joined {formatDate(m.joinedAt)}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Role Changer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Role changer dropdown (for owners or admins altering regular members) */}
                    {isAdmin && !isMemberOwner && (
                      <select
                        className="form-select btn-sm"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem', width: 'auto' }}
                        value={m.role}
                        onChange={(e) => handleRoleChange(memberId, e.target.value)}
                        disabled={!isOwner && isMemberAdmin}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        {isOwner && <option value="owner">Transfer Owner</option>}
                      </select>
                    )}

                    {/* Remove Member Button */}
                    {isAdmin && !isMemberOwner && !isCurrentUser && (
                      <button
                        onClick={() => handleRemoveMember(memberId, m.userId?.name)}
                        className="btn btn-sm btn-ghost"
                        style={{ color: 'var(--accent-rose)', padding: '0.35rem' }}
                        title="Remove member from group"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DEBTS & MINIMIZER */}
      {activeTab === 'debts' && (
        <DebtMinimizerView
          groupId={groupId}
          balances={groupBalances}
          onSettleClick={handleOpenSettle}
          currency={currency}
          onSettlementChange={() => refreshBalances(groupId)}
        />
      )}

      {/* TAB 4: ANALYTICS */}
      {activeTab === 'analytics' && (
        <AnalyticsView groupId={groupId} currency={currency} />
      )}

      {/* TAB 5: ACTIVITY */}
      {activeTab === 'activity' && (
        <ActivityTimeline groupId={groupId} />
      )}

      {/* Modals */}
      <ExpenseDetailModal
        isOpen={!!selectedDetailExpense}
        onClose={() => setSelectedDetailExpense(null)}
        expense={selectedDetailExpense}
        group={activeGroup}
        onEdit={(expense) => {
          setSelectedDetailExpense(null);
          setEditingExpense(expense);
          setIsExpenseModalOpen(true);
        }}
        onDelete={(expenseId) => {
          setSelectedDetailExpense(null);
          handleDeleteExpense(expenseId);
        }}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        group={activeGroup}
        existingExpense={editingExpense}
        onExpenseSaved={handleExpenseSaved}
      />

      <SettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        group={activeGroup}
        defaultPayer={settlePayer}
        defaultReceiver={settleReceiver}
        defaultAmount={settleAmount}
        onSettlementRecorded={handleSettlementRecorded}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        groupId={groupId}
        onMemberAdded={() => loadGroupDetails(groupId)}
      />

      <EditGroupModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        group={activeGroup}
        onGroupUpdated={() => loadGroupDetails(groupId)}
      />

      <TransferOwnershipModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        group={activeGroup}
        currentUserId={user?.id}
        onOwnershipTransferred={() => loadGroupDetails(groupId)}
      />
    </div>
  );
};
