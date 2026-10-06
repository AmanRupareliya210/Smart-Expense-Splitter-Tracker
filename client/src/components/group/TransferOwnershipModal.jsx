import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { groupService } from '../../services/groupService';
import { Crown, AlertTriangle, ShieldCheck } from 'lucide-react';

export const TransferOwnershipModal = ({
  isOpen,
  onClose,
  group,
  currentUserId,
  onOwnershipTransferred
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const eligibleMembers = group?.members?.filter(
    (m) => m.userId && m.userId._id.toString() !== currentUserId
  ) || [];

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError('Please select a member to transfer ownership to.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const updated = await groupService.transferOwnership(group._id, selectedMemberId);
      if (onOwnershipTransferred) {
        onOwnershipTransferred(updated);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to transfer ownership.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Group Ownership">
      <form onSubmit={handleTransfer}>
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-rose)',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            padding: '1rem',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start'
          }}
        >
          <AlertTriangle size={20} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>
              Important Notice
            </strong>
            Transferring ownership will make the selected member the new sole owner with full administrative authority, including the ability to manage all members, edit settings, and delete the group. You will become an <strong>Administrator</strong>.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Select New Owner *</label>
          {eligibleMembers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
              There are no other members in this group. Invite another member first before transferring ownership.
            </p>
          ) : (
            <select
              className="form-select"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              required
            >
              <option value="">-- Choose an existing group member --</option>
              {eligibleMembers.map((m) => (
                <option key={m.userId._id} value={m.userId._id}>
                  {m.userId.name} ({m.userId.email}) — Current Role: {m.role}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || eligibleMembers.length === 0}
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            <Crown size={18} />
            <span>{loading ? 'Transferring...' : 'Confirm Ownership Transfer'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
