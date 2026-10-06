import React, { useState, useEffect } from 'react';
import { groupService } from '../../services/groupService';
import { formatDateTime, getInitials } from '../../utils/formatters';
import { History, PlusCircle, CheckCircle2, UserPlus, RefreshCw, Trash2 } from 'lucide-react';

export const ActivityTimeline = ({ groupId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await groupService.getGroupActivity(groupId);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchLogs();
    }
  }, [groupId]);

  const getActionIcon = (action) => {
    switch (action) {
      case 'EXPENSE_ADDED':
        return <PlusCircle size={16} color="var(--accent-primary)" />;
      case 'SETTLEMENT_RECORDED':
        return <CheckCircle2 size={16} color="var(--accent-emerald)" />;
      case 'MEMBER_ADDED':
        return <UserPlus size={16} color="var(--accent-cyan)" />;
      case 'EXPENSE_DELETED':
      case 'MEMBER_REMOVED':
        return <Trash2 size={16} color="var(--accent-rose)" />;
      default:
        return <History size={16} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} color="var(--accent-primary)" />
          <span>Audit Log & Activity History</span>
        </h3>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn btn-sm btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          Loading timeline...
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No activity logs recorded yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
          {logs.map((log) => (
            <div
              key={log._id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '0.1rem'
              }}>
                {getActionIcon(log.action)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {log.summary}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {formatDateTime(log.createdAt)} • by {log.performedBy?.name || 'Member'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
