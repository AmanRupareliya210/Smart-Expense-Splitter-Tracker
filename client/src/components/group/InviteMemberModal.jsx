import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { groupService } from '../../services/groupService';
import { UserPlus, Mail } from 'lucide-react';

export const InviteMemberModal = ({ isOpen, onClose, groupId, onMemberAdded }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide an email address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const updatedGroup = await groupService.addMember(groupId, email.trim());
      setSuccess(`Successfully added ${email} to the group!`);
      setEmail('');
      if (onMemberAdded) {
        onMemberAdded(updatedGroup);
      }
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Group Member">
      <form onSubmit={handleAdd}>
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-rose)',
            fontSize: '0.875rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-emerald)',
            fontSize: '0.875rem',
            marginBottom: '1rem'
          }}>
            {success}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Member Email Address *</label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Mail 
              size={18} 
              color="var(--text-muted)" 
              style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} 
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            If the person does not have an account yet, one will be created so they can be immediately assigned splits.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            <UserPlus size={18} />
            <span>{loading ? 'Adding...' : 'Add Member'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
