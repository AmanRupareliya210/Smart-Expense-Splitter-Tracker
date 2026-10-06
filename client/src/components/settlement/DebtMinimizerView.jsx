import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate, getInitials } from '../../utils/formatters';
import { settlementService } from '../../services/settlementService';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowRight,
  CheckCircle,
  Zap,
  ShieldCheck,
  RotateCcw,
  History,
  FileText,
  AlertTriangle,
  CreditCard,
  UserCheck,
  Bell,
  Check
} from 'lucide-react';

export const DebtMinimizerView = ({
  groupId,
  balances,
  onSettleClick,
  currency = 'INR',
  onSettlementChange
}) => {
  const { user } = useAuth();
  const [settlementsList, setSettlementsList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reversingId, setReversingId] = useState(null);
  const [reversalError, setReversalError] = useState('');
  
  // Reminder state
  const [remindingDebtorId, setRemindingDebtorId] = useState(null);
  const [reminderNotice, setReminderNotice] = useState(null); // { debtorId, message, isError }

  const handleSendReminder = async (debtorId, debtorName) => {
    const targetGroupId = groupId || balances?.groupId;
    if (!targetGroupId || !debtorId) return;

    try {
      setRemindingDebtorId(debtorId);
      setReminderNotice(null);
      await notificationService.sendSettlementReminder(targetGroupId, { debtorId });
      setReminderNotice({
        debtorId,
        message: `Reminder sent to ${debtorName}!`,
        isError: false
      });
      setTimeout(() => setReminderNotice(null), 4000);
    } catch (err) {
      setReminderNotice({
        debtorId,
        message: err.message || 'Failed to send reminder',
        isError: true
      });
      setTimeout(() => setReminderNotice(null), 6000);
    } finally {
      setRemindingDebtorId(null);
    }
  };

  const fetchSettlementHistory = async () => {
    if (!groupId && !balances?.groupId) return;
    const targetGroupId = groupId || balances?.groupId;
    try {
      setLoadingHistory(true);
      const res = await settlementService.getGroupSettlements(targetGroupId);
      setSettlementsList(res.data?.settlements || res.settlements || res.data || []);
    } catch (err) {
      console.error('Failed to load settlement history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchSettlementHistory();
  }, [groupId, balances?.groupId]);

  const handleReverse = async (settlementId) => {
    const reason = window.prompt('Please enter a reason for reversing this settlement (optional):', 'Mistake in recording');
    if (reason === null) return; // User cancelled prompt

    try {
      setReversalError('');
      setReversingId(settlementId);
      const targetGroupId = groupId || balances?.groupId;
      await settlementService.reverseSettlement(targetGroupId, settlementId, reason);
      await fetchSettlementHistory();
      if (onSettlementChange) {
        await onSettlementChange();
      }
    } catch (err) {
      setReversalError(err.message || 'Failed to reverse settlement');
    } finally {
      setReversingId(null);
    }
  };

  if (!balances) return null;

  const { memberBalances = [], simplifiedSettlements = [] } = balances;
  const currentUserId = user?.id || user?._id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Algorithm Explainer Banner */}
      <div
        style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              flexShrink: 0
            }}
          >
            <Zap size={22} color="#ffffff" />
          </div>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Greedy Debt Minimization Engine
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Reduces multi-party circular obligations into{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{simplifiedSettlements.length} direct optimal transfers</strong>{' '}
              while strictly preserving each member's exact net financial balance.
            </p>
          </div>
        </div>

        <div className="badge badge-emerald" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          <ShieldCheck size={15} />
          <span>Conservation of Value Verified</span>
        </div>
      </div>

      {reversalError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-rose)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <AlertTriangle size={18} />
          <span>{reversalError}</span>
        </div>
      )}

      {/* SECTION 1: SIMPLIFIED SETTLEMENTS */}
      <div>
        <h3
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-primary)'
          }}
        >
          <span>Suggested Settlements</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            ({simplifiedSettlements.length} payment{simplifiedSettlements.length === 1 ? '' : 's'} to settle all group debts)
          </span>
        </h3>

        {simplifiedSettlements.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}
            >
              <CheckCircle size={32} color="var(--accent-emerald)" />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>All Settled Up!</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              No outstanding debts in this group. Everyone is even.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
            {simplifiedSettlements.map((settle, idx) => (
              <div
                key={idx}
                className="glass-card glass-card-interactive"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  gap: '0.75rem'
                }}
              >
                {/* From User */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(244, 63, 94, 0.2)',
                      border: '1px solid rgba(244, 63, 94, 0.4)',
                      color: 'var(--accent-rose)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}
                  >
                    {getInitials(settle.from.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {settle.from.name}
                      {settle.from.id === currentUserId && <span style={{ color: 'var(--accent-primary)', marginLeft: '0.25rem' }}>(You)</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: 600 }}>owes</div>
                  </div>
                </div>

                {/* Transfer Arrow & Amount */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                  <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatCurrency(settle.amount, currency)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-primary)' }}>
                    <div style={{ width: '20px', height: '2px', background: 'var(--accent-primary)' }} />
                    <ArrowRight size={14} />
                  </div>
                </div>

                {/* To User & Settle Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {settle.to.name}
                      {settle.to.id === currentUserId && <span style={{ color: 'var(--accent-primary)', marginLeft: '0.25rem' }}>(You)</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>receives</div>
                  </div>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: 'var(--accent-emerald)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}
                  >
                    {getInitials(settle.to.name)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.25rem' }}>
                    <button
                      onClick={() => onSettleClick(settle.from.id, settle.to.id, settle.amount)}
                      className="btn btn-sm btn-emerald"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                    >
                      Settle
                    </button>

                    {/* Send Reminder button if current user is creditor or in group */}
                    <button
                      onClick={() => handleSendReminder(settle.from.id, settle.from.name)}
                      disabled={remindingDebtorId === settle.from.id}
                      className="btn btn-sm btn-ghost"
                      title={`Send settlement reminder to ${settle.from.name}`}
                      style={{
                        padding: '0.35rem 0.55rem',
                        fontSize: '0.78rem',
                        color: 'var(--accent-amber)',
                        borderColor: 'rgba(245, 158, 11, 0.3)'
                      }}
                    >
                      <Bell size={13} className={remindingDebtorId === settle.from.id ? 'spin' : ''} />
                      <span>{remindingDebtorId === settle.from.id ? 'Sending...' : 'Remind'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Global Toast for Reminder status */}
        {reminderNotice && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: reminderNotice.isError ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: reminderNotice.isError ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
              color: reminderNotice.isError ? 'var(--accent-rose)' : 'var(--accent-emerald)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            {reminderNotice.isError ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            <span>{reminderNotice.message}</span>
          </div>
        )}
      </div>

      {/* SECTION 2: MEMBER LEDGERS TABLE */}
      <div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Member Net Balances
        </h3>
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--bg-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <th style={{ padding: '0.85rem 1.25rem' }}>Member</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Total Paid</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Total Owed</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Settlements (Paid / Recv)</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Net Balance</th>
                </tr>
              </thead>
              <tbody>
                {memberBalances.map((m) => {
                  const isOwed = m.netBalance > 0;
                  const owes = m.netBalance < 0;
                  const isCurrentUser = m.userId === currentUserId;

                  return (
                    <tr
                      key={m.userId}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isCurrentUser ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            color: '#ffffff'
                          }}
                        >
                          {getInitials(m.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {m.name} {isCurrentUser && <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem' }}>(You)</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email}</div>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }} className="font-mono">
                        {formatCurrency(m.totalPaid, currency)}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }} className="font-mono">
                        {formatCurrency(m.totalOwed, currency)}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }} className="font-mono">
                        +{formatCurrency(m.settlementsPaid, currency)} / -{formatCurrency(m.settlementsReceived, currency)}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <span
                          className={`badge font-mono ${
                            isOwed ? 'badge-emerald' : owes ? 'badge-rose' : 'badge-indigo'
                          }`}
                          style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem', fontWeight: 700 }}
                        >
                          {isOwed ? `+${formatCurrency(m.netBalance, currency)} (Gets back)` : owes ? `${formatCurrency(m.netBalance, currency)} (Owes)` : 'Settled'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: SETTLEMENT HISTORY */}
      <div>
        <h3
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-primary)'
          }}
        >
          <History size={18} />
          <span>Settlement History ({settlementsList.length})</span>
        </h3>

        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Loading settlement history...
          </div>
        ) : settlementsList.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No payments have been recorded for this group yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {settlementsList.map((st) => {
              const isReversed = st.isReversed || st.status === 'REVERSED';
              const canReverse =
                !isReversed &&
                (st.paidBy?._id === currentUserId ||
                  st.paidTo?._id === currentUserId ||
                  st.createdBy?._id === currentUserId ||
                  st.createdBy === currentUserId);

              return (
                <div
                  key={st._id}
                  className="glass-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    opacity: isReversed ? 0.6 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        background: isReversed ? 'rgba(156, 163, 175, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        border: `1px solid ${isReversed ? 'rgba(156, 163, 175, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isReversed ? 'var(--text-muted)' : 'var(--accent-emerald)'
                      }}
                    >
                      <CreditCard size={18} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{st.paidBy?.name || 'Member'}</span>
                        <ArrowRight size={14} color="var(--text-muted)" />
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{st.paidTo?.name || 'Member'}</span>
                        <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                          {st.paymentMethod}
                        </span>
                        {isReversed && (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(244, 63, 94, 0.2)',
                              color: 'var(--accent-rose)',
                              border: '1px solid rgba(244, 63, 94, 0.4)',
                              fontSize: '0.7rem'
                            }}
                          >
                            Reversed
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {formatDate(st.settledAt || st.createdAt)}
                        {st.notes && ` • "${st.notes}"`}
                        {isReversed && st.reversalReason && ` • Reversal Reason: ${st.reversalReason}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: isReversed ? 'var(--text-muted)' : 'var(--accent-emerald)' }}>
                      {formatCurrency(st.amount, currency)}
                    </div>

                    {canReverse && (
                      <button
                        onClick={() => handleReverse(st._id)}
                        disabled={reversingId === st._id}
                        className="btn btn-sm btn-ghost"
                        style={{ color: 'var(--accent-rose)', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        title="Reverse this settlement"
                      >
                        <RotateCcw size={14} />
                        <span>Reverse</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
