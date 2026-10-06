import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { CATEGORIES, SPLIT_TYPES } from '../../utils/constants';
import { expenseService } from '../../services/expenseService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, getInitials } from '../../utils/formatters';
import { DollarSign, Calendar, Check, AlertCircle, Sparkles } from 'lucide-react';

export const ExpenseModal = ({ isOpen, onClose, group, onExpenseSaved, existingExpense = null }) => {
  const { user } = useAuth();
  const members = group?.members || [];

  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [category, setCategory] = useState('General');
  const [splitType, setSplitType] = useState('EQUAL');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Split state configurations
  // Equal: Set of selected user IDs
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  // Exact: Map of userId -> amount string
  const [exactAmounts, setExactAmounts] = useState({});
  // Percentage: Map of userId -> percentage string
  const [percentages, setPercentages] = useState({});
  // Shares: Map of userId -> shares string
  const [shares, setShares] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (existingExpense) {
        setTitle(existingExpense.title);
        setTotalAmount((existingExpense.totalAmount / 100).toString());
        setPaidBy(existingExpense.paidBy?._id || existingExpense.paidBy);
        setCategory(existingExpense.category || 'General');
        setSplitType(existingExpense.splitType || 'EQUAL');
        setExpenseDate(new Date(existingExpense.expenseDate).toISOString().split('T')[0]);
        setNotes(existingExpense.notes || '');

        const currentSplits = existingExpense.splits || [];
        setSelectedUserIds(new Set(currentSplits.map((s) => s.userId?._id || s.userId)));

        const exMap = {};
        const percMap = {};
        const shareMap = {};
        currentSplits.forEach((s) => {
          const uid = s.userId?._id || s.userId;
          if (s.amount) exMap[uid] = (s.amount / 100).toString();
          if (s.percentage) percMap[uid] = s.percentage.toString();
          if (s.shares) shareMap[uid] = s.shares.toString();
        });
        setExactAmounts(exMap);
        setPercentages(percMap);
        setShares(shareMap);
      } else {
        // Default new expense
        setTitle('');
        setTotalAmount('');
        setPaidBy(user?.id || (members[0]?.userId?._id || ''));
        setCategory('General');
        setSplitType('EQUAL');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        
        // Select all members by default for equal split
        const allIds = new Set(members.map((m) => m.userId?._id));
        setSelectedUserIds(allIds);

        // Initialize default percentages and shares
        const perc = {};
        const shr = {};
        const equalPerc = (100 / Math.max(members.length, 1)).toFixed(2);
        members.forEach((m) => {
          const uid = m.userId?._id;
          perc[uid] = equalPerc;
          shr[uid] = '1';
        });
        setPercentages(perc);
        setShares(shr);
        setExactAmounts({});
      }
      setError('');
    }
  }, [isOpen, existingExpense, group, user]);

  const toggleMemberEqual = (userId) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) {
      if (next.size > 1) {
        next.delete(userId);
      }
    } else {
      next.add(userId);
    }
    setSelectedUserIds(next);
  };

  // Live Split Calculations & Verifications
  const numericTotal = parseFloat(totalAmount) || 0;

  const getExactTotal = () => {
    return Object.values(exactAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const getPercentageTotal = () => {
    return Object.values(percentages).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const getSharesTotal = () => {
    return Object.values(shares).reduce((sum, val) => sum + (parseInt(val, 10) || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter an expense title');
      return;
    }
    if (numericTotal <= 0) {
      setError('Expense amount must be greater than 0');
      return;
    }
    if (!paidBy) {
      setError('Please select who paid for the expense');
      return;
    }

    let payloadSplits = [];

    if (splitType === 'EQUAL') {
      if (selectedUserIds.size === 0) {
        setError('At least one member must be selected in equal split');
        return;
      }
      payloadSplits = Array.from(selectedUserIds).map((uid) => ({ userId: uid }));
    } else if (splitType === 'EXACT') {
      const currentExact = getExactTotal();
      if (Math.abs(currentExact - numericTotal) > 0.01) {
        setError(
          `Exact amounts sum ($${currentExact.toFixed(2)}) must equal total amount ($${numericTotal.toFixed(2)})`
        );
        return;
      }
      payloadSplits = Object.entries(exactAmounts)
        .filter(([_, val]) => parseFloat(val) > 0)
        .map(([uid, val]) => ({ userId: uid, amount: Math.round(parseFloat(val) * 100) }));
    } else if (splitType === 'PERCENTAGE') {
      const currentPerc = getPercentageTotal();
      if (Math.abs(currentPerc - 100) > 0.1) {
        setError(`Percentages must sum to 100%. Current sum is ${currentPerc.toFixed(1)}%`);
        return;
      }
      payloadSplits = Object.entries(percentages)
        .filter(([_, val]) => parseFloat(val) > 0)
        .map(([uid, val]) => ({ userId: uid, percentage: parseFloat(val) }));
    } else if (splitType === 'SHARES') {
      const currentShares = getSharesTotal();
      if (currentShares <= 0) {
        setError('Total shares must be greater than 0');
        return;
      }
      payloadSplits = Object.entries(shares)
        .filter(([_, val]) => parseInt(val, 10) > 0)
        .map(([uid, val]) => ({ userId: uid, shares: parseInt(val, 10) }));
    }

    try {
      setLoading(true);
      setError('');
      const payload = {
        title: title.trim(),
        totalAmount: numericTotal,
        paidBy,
        splitType,
        splits: payloadSplits,
        category,
        expenseDate,
        notes: notes.trim()
      };

      let result;
      if (existingExpense) {
        result = await expenseService.updateExpense(group._id, existingExpense._id, payload);
      } else {
        result = await expenseService.addExpense(group._id, payload);
      }

      onClose();
      if (onExpenseSaved) {
        onExpenseSaved(result);
      }
    } catch (err) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingExpense ? 'Edit Expense' : 'Add New Expense'}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-rose)',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Title & Amount Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Expense Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Dinner, Uber, Airbnb deposit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Total Amount ({group?.currency || 'USD'}) *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input font-mono"
                style={{ paddingLeft: '2.4rem', fontSize: '1.05rem', fontWeight: 600 }}
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                required
              />
              <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>
                $
              </span>
            </div>
          </div>
        </div>

        {/* Payer & Category Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Paid By *</label>
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

          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Split Type Selector */}
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Split Method</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
              {SPLIT_TYPES.find((t) => t.id === splitType)?.label}
            </span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {SPLIT_TYPES.map((type) => (
              <button
                type="button"
                key={type.id}
                onClick={() => setSplitType(type.id)}
                style={{
                  padding: '0.6rem 0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  background: splitType === type.id ? 'var(--accent-primary)' : '#ffffff',
                  border: `1px solid ${splitType === type.id ? 'transparent' : 'var(--border-medium)'}`,
                  color: splitType === type.id ? '#ffffff' : 'var(--text-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxShadow: splitType === type.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Split Breakdown Configurator */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          margin: '1rem 0'
        }}>
          {splitType === 'EQUAL' && (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Select who splits this bill:</span>
                <span className="font-mono text-emerald">
                  {selectedUserIds.size > 0 && numericTotal > 0
                    ? `$${(numericTotal / selectedUserIds.size).toFixed(2)} / person`
                    : '$0.00 / person'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                {members.map((m) => {
                  const uid = m.userId?._id;
                  const isSelected = selectedUserIds.has(uid);
                  return (
                    <button
                      type="button"
                      key={uid}
                      onClick={() => toggleMemberEqual(uid)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? '#ecfdf5' : '#ffffff',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        color: isSelected ? '#047857' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontSize: '0.825rem',
                        fontWeight: isSelected ? 600 : 500
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.userId?.name}
                      </span>
                      {isSelected && <Check size={14} color="var(--accent-primary)" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {splitType === 'EXACT' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Assign exact amounts:</span>
                <span className={`font-mono ${Math.abs(getExactTotal() - numericTotal) < 0.01 ? 'text-emerald' : 'text-rose'}`}>
                  Allocated: ${getExactTotal().toFixed(2)} of ${numericTotal.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {members.map((m) => {
                  const uid = m.userId?._id;
                  return (
                    <div key={uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ fontSize: '0.85rem' }}>{m.userId?.name}</span>
                      <div style={{ position: 'relative', width: '130px' }}>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="form-input font-mono btn-sm"
                          style={{ paddingLeft: '1.75rem' }}
                          value={exactAmounts[uid] || ''}
                          onChange={(e) => setExactAmounts({ ...exactAmounts, [uid]: e.target.value })}
                        />
                        <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          $
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {splitType === 'PERCENTAGE' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Assign percentages:</span>
                <span className={`font-mono ${Math.abs(getPercentageTotal() - 100) < 0.1 ? 'text-emerald' : 'text-rose'}`}>
                  Total: {getPercentageTotal().toFixed(1)}% / 100%
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {members.map((m) => {
                  const uid = m.userId?._id;
                  const p = parseFloat(percentages[uid] || 0);
                  const approxAmount = ((p / 100) * numericTotal).toFixed(2);
                  return (
                    <div key={uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ fontSize: '0.85rem' }}>{m.userId?.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(${approxAmount})</span>
                        <div style={{ position: 'relative', width: '100px' }}>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            className="form-input font-mono btn-sm"
                            style={{ paddingRight: '1.5rem' }}
                            value={percentages[uid] || ''}
                            onChange={(e) => setPercentages({ ...percentages, [uid]: e.target.value })}
                          />
                          <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {splitType === 'SHARES' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Assign weighted share units:</span>
                <span className="font-mono text-emerald">
                  Total Shares: {getSharesTotal()}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {members.map((m) => {
                  const uid = m.userId?._id;
                  const s = parseInt(shares[uid] || 0, 10);
                  const totalS = getSharesTotal();
                  const approxAmount = totalS > 0 ? ((s / totalS) * numericTotal).toFixed(2) : '0.00';
                  return (
                    <div key={uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ fontSize: '0.85rem' }}>{m.userId?.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(${approxAmount})</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="1"
                          className="form-input font-mono btn-sm"
                          style={{ width: '90px' }}
                          value={shares[uid] || ''}
                          onChange={(e) => setShares({ ...shares, [uid]: e.target.value })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Date and Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Expense Date</label>
            <input
              type="date"
              className="form-input"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Receipt was shared on WhatsApp"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            <Sparkles size={18} />
            <span>{loading ? 'Saving...' : existingExpense ? 'Update Expense' : 'Add Expense'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
