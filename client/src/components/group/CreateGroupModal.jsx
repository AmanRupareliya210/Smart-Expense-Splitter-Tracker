import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { GROUP_CATEGORIES, CURRENCY_SYMBOLS } from '../../utils/constants';
import { groupService } from '../../services/groupService';
import { useGroup } from '../../context/GroupContext';
import { FolderPlus, Users } from 'lucide-react';

export const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const { fetchMyGroups } = useGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Trip');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a group name');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const newGroup = await groupService.createGroup({
        name: name.trim(),
        description: description.trim(),
        category,
        currency
      });

      await fetchMyGroups();
      setName('');
      setDescription('');
      onClose();
      if (onGroupCreated) {
        onGroupCreated(newGroup);
      }
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Expense Group">
      <form onSubmit={handleSubmit}>
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

        <div className="form-group">
          <label className="form-label">Group Name *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Summer Vacation, Flat 402, Hackathon Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {GROUP_CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  padding: '0.65rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  background: category === cat.id ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-glass)',
                  border: `1px solid ${category === cat.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  color: category === cat.id ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Default Currency</label>
          <select
            className="form-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {Object.keys(CURRENCY_SYMBOLS).map((curr) => (
              <option key={curr} value={curr}>
                {curr} ({CURRENCY_SYMBOLS[curr]})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Description (Optional)</label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="What is this group for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            <FolderPlus size={18} />
            <span>{loading ? 'Creating...' : 'Create Group'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
