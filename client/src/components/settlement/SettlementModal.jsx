import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { PAYMENT_METHODS } from '../../utils/constants';
import { settlementService } from '../../services/settlementService';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export const SettlementModal = ({
  isOpen,
  onClose,
  group,
  defaultPayer = null,
  defaultReceiver = null,
  defaultAmount = null,
  onSettlementRecorded
}) => {
  const { user } = useAuth();
  const members = group?.members || [];

  const [paidBy, setPaidBy] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPaidBy(defaultPayer || user?.id || (members[0]?.userId?._id || ''));
      setPaidTo(defaultReceiver || (members[1]?.userId?._id || ''));
      setAmount(defaultAmount ? (defaultAmount / 100).toFixed(2) : '');
      setPaymentMethod('UPI');
      setNotes('');
      setError('');
    }
  }, [isOpen, defaultPayer, defaultReceiver, defaultAmount, group, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!paidBy || !paidTo) {
      setError('Please select both payer and receiver');
      return;
    }
    if (paidBy === paidTo) {
      setError('Payer and receiver cannot be the same person');
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await settlementService.recordSettlement(group._id, {
        paidBy,
        paidTo,
        amount: numAmount,
        paymentMethod,
        notes: notes.trim()
      });

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // Safe fallback
      }

      onClose();
      if (onSettlementRecorded) {
        onSettlementRecorded(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to record settlement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Debt Settlement">
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

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          background: 'var(--bg-subtle)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          border: '1px solid var(--border-subtle)'
        }}>
          {/* Payer */}
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ color: 'var(--accent-rose)' }}>Payer (Who Paid)</label>
            <select
              className="form-select"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              required
            >
              {members.map((m) => (
                <option key={m.userId?._id} value={m.userId?._id}>
                  {m.userId?.name} {m.userId?._id === user?.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '1.2rem',
            flexShrink: 0
          }}>
            <ArrowRight size={18} color="#ffffff" />
          </div>

          {/* Receiver */}
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ color: 'var(--accent-emerald)' }}>Recipient (Who Received)</label>
            <select
              className="form-select"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              required
            >
              {members.map((m) => (
                <option key={m.userId?._id} value={m.userId?._id}>
                  {m.userId?.name} {m.userId?._id === user?.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Settlement Amount ({group?.currency || 'INR'}) *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input font-mono"
                style={{ paddingLeft: '2.2rem', fontSize: '1.1rem', fontWeight: 700 }}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
              <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>
                $
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select
              className="form-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes / Reference (Optional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Paid via GooglePay / Venmo reference #4928"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-emerald">
            <CheckCircle2 size={18} />
            <span>{loading ? 'Recording...' : 'Record Payment'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
