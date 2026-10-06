import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, getInitials } from '../../utils/formatters';
import { CATEGORIES } from '../../utils/constants';
import { X, Calendar, User, Tag, FileText, Clock, Edit2, Trash2, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ExpenseDetailModal = ({
  isOpen,
  onClose,
  expense,
  group,
  onEdit,
  onDelete
}) => {
  const { user } = useAuth();

  if (!isOpen || !expense) return null;

  const currency = group?.currency || expense.currency || 'USD';
  const categoryInfo = CATEGORIES.find((c) => c.id === expense.category) || {
    label: expense.category || 'Other',
    color: '#6366f1'
  };

  const currentUserId = user?.id || user?._id;
  const payerId = expense.paidBy?._id || expense.paidBy;
  const creatorId = expense.createdBy?._id || expense.createdBy;

  // Role check
  const memberRecord = group?.members?.find((m) => (m.userId?._id || m.userId) === currentUserId);
  const userRole = memberRecord?.role || 'member';
  const isOwner = group?.owner?._id === currentUserId || group?.owner === currentUserId || userRole === 'owner';
  const isAdmin = userRole === 'admin' || isOwner;
  const isPayer = payerId === currentUserId;
  const isCreator = creatorId === currentUserId;
  const canModify = (isCreator || isPayer || isAdmin) && !group?.isArchived;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-card"
        style={{
          maxWidth: '560px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: `${categoryInfo.color}25`,
                border: `1px solid ${categoryInfo.color}45`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem'
              }}
            >
              💳
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {expense.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <span
                  className="badge"
                  style={{
                    background: `${categoryInfo.color}20`,
                    color: categoryInfo.color,
                    border: `1px solid ${categoryInfo.color}40`,
                    fontSize: '0.725rem'
                  }}
                >
                  {categoryInfo.label}
                </span>
                <span className="badge badge-indigo" style={{ textTransform: 'capitalize', fontSize: '0.725rem' }}>
                  {expense.splitType} Split
                </span>
                {expense.isEdited && (
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--accent-amber)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '0.7rem'
                    }}
                  >
                    Edited
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '0.4rem', borderRadius: '50%', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Amount Card */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            textAlign: 'center',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Amount
          </div>
          <div className="font-mono" style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
            {formatCurrency(expense.totalAmount, currency)}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Paid by <strong style={{ color: 'var(--text-primary)' }}>{expense.paidBy?.name || 'Unknown'}</strong> on {formatDate(expense.expenseDate)}
          </div>
        </div>

        {/* Metadata section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <Calendar size={16} color="var(--accent-primary)" />
            <span>Date: <strong>{formatDate(expense.expenseDate)}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <User size={16} color="var(--accent-primary)" />
            <span>Payer: <strong>{expense.paidBy?.name || 'Unknown'}</strong></span>
          </div>
        </div>

        {/* Notes (if any) */}
        {expense.notes && (
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
              <FileText size={14} /> Notes
            </div>
            <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{expense.notes}</div>
          </div>
        )}

        {/* Splits Breakdown */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Participant Breakdown ({expense.splits?.length || 0})
          </h4>
          <div
            style={{
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden'
            }}
          >
            {expense.splits?.map((split, idx) => {
              const participantUser = split.userId;
              const isPayerParticipant = (participantUser?._id || participantUser) === payerId;
              const isCurrentUser = (participantUser?._id || participantUser) === currentUserId;

              return (
                <div
                  key={split._id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderBottom: idx < expense.splits.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: isCurrentUser ? 'rgba(99, 102, 241, 0.06)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      {getInitials(participantUser?.name || 'U')}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {participantUser?.name || 'Unknown member'}
                        {isCurrentUser && <span style={{ color: 'var(--accent-primary)', marginLeft: '0.35rem' }}>(You)</span>}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        {expense.splitType === 'percentage' && split.percentage !== undefined && `${split.percentage}%`}
                        {expense.splitType === 'shares' && split.shares !== undefined && `${split.shares} share${split.shares > 1 ? 's' : ''}`}
                        {isPayerParticipant && (
                          <span style={{ color: 'var(--accent-emerald)', marginLeft: '0.35rem' }}>
                            • Paid full bill
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCurrency(split.amount, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit details */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1rem',
            marginTop: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}
        >
          <div>
            Created by {expense.createdBy?.name || 'Member'} on {formatDate(expense.createdAt || expense.expenseDate)}
          </div>
          {expense.isEdited && expense.lastEditedBy && (
            <div>
              Last edited by {expense.lastEditedBy?.name || 'Member'} on {formatDate(expense.updatedAt)}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1.25rem',
            marginTop: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <div>
            {canModify && (
              <button
                onClick={() => {
                  onClose();
                  onDelete(expense._id);
                }}
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Trash2 size={15} />
                <span>Delete Expense</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} className="btn btn-sm btn-ghost">
              Close
            </button>
            {canModify && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(expense);
                }}
                className="btn btn-sm btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Edit2 size={15} />
                <span>Edit Expense</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
