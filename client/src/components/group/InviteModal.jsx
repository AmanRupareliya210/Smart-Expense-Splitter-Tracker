import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { groupService } from '../../services/groupService';
import { authService } from '../../services/authService';
import { Link, Copy, Check, UserPlus, Shield, Trash2, Mail, Users, Clock, AlertCircle } from 'lucide-react';

export const InviteModal = ({ isOpen, onClose, groupId, onMemberAdded }) => {
  const [activeTab, setActiveTab] = useState('link'); // 'link' | 'email'
  
  // Link state
  const [inviteUrl, setInviteUrl] = useState('');
  const [linkRole, setLinkRole] = useState('member');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [linkLoading, setLinkLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  
  // Email direct invite state
  const [email, setEmail] = useState('');
  const [directRole, setDirectRole] = useState('member');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load existing pending invites when opening link tab
  const loadPendingInvites = async () => {
    if (!groupId) return;
    try {
      setLoadingInvites(true);
      const invites = await groupService.getGroupInvitations(groupId);
      setPendingInvites(invites || []);
    } catch {
      // Ignore
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccess('');
      setCopied(false);
      loadPendingInvites();
    }
  }, [isOpen, groupId]);

  // Generate a new secure link
  const handleGenerateLink = async () => {
    try {
      setLinkLoading(true);
      setError('');
      const data = await groupService.createInvitation(groupId, {
        role: linkRole,
        expiresInDays: Number(expiresInDays)
      });
      setInviteUrl(data.inviteUrl);
      loadPendingInvites();
    } catch (err) {
      setError(err.message || 'Failed to generate invitation link');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRevokeInvite = async (invitationId) => {
    try {
      await groupService.revokeInvitation(groupId, invitationId);
      setPendingInvites((prev) => prev.filter((i) => i._id !== invitationId));
      if (inviteUrl) {
        setInviteUrl('');
      }
    } catch (err) {
      setError(err.message || 'Failed to revoke invitation');
    }
  };

  // Direct user search
  const handleSearchUsers = async (query) => {
    setEmail(query);
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const results = await authService.searchUsers(query);
      setSearchResults(results || []);
    } catch {
      // Ignore search error
    } finally {
      setSearching(false);
    }
  };

  const handleDirectAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setEmailLoading(true);
      setError('');
      setSuccess('');
      const updatedGroup = await groupService.addMember(groupId, email.trim(), directRole);
      setSuccess(`Successfully added ${email} as ${directRole}!`);
      setEmail('');
      setSearchResults([]);
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
      setEmailLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite to Expense Group">
      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
          marginBottom: '1.25rem'
        }}
      >
        <button
          type="button"
          onClick={() => { setActiveTab('link'); setError(''); }}
          style={{
            flex: 1,
            padding: '0.6rem 1rem',
            background: activeTab === 'link' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            border: `1px solid ${activeTab === 'link' ? 'var(--accent-primary)' : 'transparent'}`,
            borderRadius: 'var(--radius-sm)',
            color: activeTab === 'link' ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontWeight: 500,
            fontSize: '0.875rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Link size={16} />
          <span>Shareable Link</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('email'); setError(''); }}
          style={{
            flex: 1,
            padding: '0.6rem 1rem',
            background: activeTab === 'email' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            border: `1px solid ${activeTab === 'email' ? 'var(--accent-primary)' : 'transparent'}`,
            borderRadius: 'var(--radius-sm)',
            color: activeTab === 'email' ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontWeight: 500,
            fontSize: '0.875rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Mail size={16} />
          <span>Direct Email</span>
        </button>
      </div>

      {error && (
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
            gap: '0.5rem'
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
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
            gap: '0.5rem'
          }}
        >
          <Check size={16} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {/* TAB 1: SHAREABLE LINK */}
      {activeTab === 'link' && (
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Create a cryptographically secure, expiring link that allows anyone to view and join this group after logging in.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Assigned Role</label>
              <select
                className="form-select"
                value={linkRole}
                onChange={(e) => setLinkRole(e.target.value)}
              >
                <option value="member">Member (Regular)</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Expires In</label>
              <select
                className="form-select"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              >
                <option value={1}>1 Day</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days (Recommended)</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>
          </div>

          {!inviteUrl ? (
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={linkLoading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              <Link size={18} />
              <span>{linkLoading ? 'Generating Link...' : 'Generate Secure Invite Link'}</span>
            </button>
          ) : (
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Generated Invitation Link</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="form-input"
                  style={{
                    fontSize: '0.85rem',
                    background: 'rgba(0,0,0,0.4)',
                    color: 'var(--accent-primary-light)'
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn btn-primary"
                  style={{ flexShrink: 0 }}
                >
                  {copied ? <Check size={18} color="#fff" /> : <Copy size={18} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Pending Invitations Section */}
          {pendingInvites.length > 0 && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Active Pending Links ({pendingInvites.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto' }}>
                {pendingInvites.map((inv) => (
                  <div
                    key={inv._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>
                          {inv.role} Role Link
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} />
                        <span>Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(inv._id)}
                      title="Revoke link"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-rose)',
                        cursor: 'pointer',
                        padding: '0.3rem'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DIRECT EMAIL ADD */}
      {activeTab === 'email' && (
        <form onSubmit={handleDirectAdd}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Directly add a user to this group by their registered email address.
          </p>

          <div className="form-group">
            <label className="form-label">Member Email Address *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="search user by name or email..."
                value={email}
                onChange={(e) => handleSearchUsers(e.target.value)}
                required
                autoFocus
              />
              <Mail
                size={18}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>

            {/* Autocomplete suggestions dropdown */}
            {searchResults.length > 0 && (
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '0.35rem',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}
              >
                {searchResults.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => {
                      setEmail(u.email);
                      setSearchResults([]);
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontWeight: 500, color: '#fff' }}>{u.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Assign Role</label>
            <select
              className="form-select"
              value={directRole}
              onChange={(e) => setDirectRole(e.target.value)}
            >
              <option value="member">Member</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={emailLoading} className="btn btn-primary">
              <UserPlus size={18} />
              <span>{emailLoading ? 'Adding...' : 'Add Member'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

// Backwards compatibility export
export const InviteMemberModal = InviteModal;
