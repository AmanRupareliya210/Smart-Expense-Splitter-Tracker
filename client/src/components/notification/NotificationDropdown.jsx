import React, { useState, useRef, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { formatDateTime } from '../../utils/formatters';
import {
  Bell,
  CheckCircle2,
  Receipt,
  RotateCcw,
  UserPlus,
  Zap,
  Trash2,
  CheckCheck,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const NotificationDropdown = ({ onNavigateToGroup }) => {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotification();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'EXPENSE_ADDED':
      case 'EXPENSE_UPDATED':
        return (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Receipt size={16} color="var(--accent-primary)" />
          </div>
        );
      case 'SETTLEMENT_RECORDED':
        return (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={16} color="var(--accent-emerald)" />
          </div>
        );
      case 'SETTLEMENT_REVERSED':
        return (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(244, 63, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <RotateCcw size={16} color="var(--accent-rose)" />
          </div>
        );
      case 'SETTLEMENT_REMINDER':
        return (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Zap size={16} color="var(--accent-amber)" />
          </div>
        );
      case 'MEMBER_ADDED':
      case 'GROUP_INVITATION':
        return (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <UserPlus size={16} color="var(--accent-cyan)" />
          </div>
        );
      default:
        return (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Bell size={16} color="var(--text-secondary)" />
          </div>
        );
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return !item.isRead;
    return true;
  });

  const handleItemClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    if (notification.groupId?._id || notification.groupId) {
      const gId = notification.groupId._id || notification.groupId;
      if (onNavigateToGroup) {
        onNavigateToGroup(gId);
        setIsOpen(false);
      }
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        className="btn btn-ghost"
        style={{
          position: 'relative',
          padding: '0.55rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        aria-label="Notifications"
      >
        <Bell size={19} color={unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              background: 'var(--accent-rose)',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 10px rgba(244, 63, 94, 0.6)',
              lineHeight: 1
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="glass-card"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            maxWidth: '92vw',
            maxHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            zIndex: 200,
            background: '#ffffff',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '6px'
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn btn-sm btn-ghost"
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  color: 'var(--accent-primary)'
                }}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '0.35rem 0.75rem',
              background: 'var(--bg-subtle)',
              gap: '0.5rem'
            }}
          >
            <button
              onClick={() => setFilter('all')}
              style={{
                background: filter === 'all' ? '#ffffff' : 'transparent',
                border: filter === 'all' ? '1px solid var(--border-medium)' : '1px solid transparent',
                color: filter === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: filter === 'all' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                background: filter === 'unread' ? '#ffffff' : 'transparent',
                border: filter === 'unread' ? '1px solid var(--border-medium)' : '1px solid transparent',
                color: filter === 'unread' ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: filter === 'unread' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              maxHeight: '380px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem auto'
                  }}
                >
                  <Bell size={20} color="var(--text-muted)" />
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {filter === 'unread'
                    ? "You're all caught up!"
                    : 'Activity in your groups will appear here.'}
                </div>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const groupName = item.groupId?.name;

                return (
                  <div
                    key={item._id}
                    onClick={() => handleItemClick(item)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: item.isRead ? '#ffffff' : '#f0fdf4',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      transition: 'background 0.15s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = item.isRead ? 'var(--bg-subtle)' : '#dcfce7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = item.isRead ? '#ffffff' : '#f0fdf4';
                    }}
                  >
                    {getNotificationIcon(item.type)}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.2rem'
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: item.isRead ? 600 : 700,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '220px'
                          }}
                        >
                          {item.title}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {formatDateTime(item.createdAt).split(',')[0]}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.35,
                          marginBottom: '0.35rem'
                        }}
                      >
                        {item.message}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        {groupName ? (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: '#047857',
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontWeight: 600
                            }}
                          >
                            {groupName}
                          </span>
                        ) : <span />}

                        {/* Dismiss / Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(item._id);
                          }}
                          className="btn btn-ghost"
                          title="Dismiss"
                          style={{
                            padding: '0.15rem 0.35rem',
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            opacity: 0.7
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {!item.isRead && (
                      <div
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: 'var(--accent-primary)',
                          flexShrink: 0,
                          marginTop: '0.35rem'
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
