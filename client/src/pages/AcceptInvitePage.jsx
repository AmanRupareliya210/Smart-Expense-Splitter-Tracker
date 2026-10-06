import React, { useState, useEffect } from 'react';
import { invitationService } from '../services/invitationService';
import { useAuth } from '../context/AuthContext';
import { GROUP_CATEGORIES } from '../utils/constants';
import confetti from 'canvas-confetti';
import { Users, CheckCircle, AlertCircle, ArrowRight, ShieldCheck, Clock, LogIn, UserPlus } from 'lucide-react';

export const AcceptInvitePage = ({ token, onJoinedGroup, onNavigateAuth }) => {
  const { user } = useAuth();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [joinedSuccess, setJoinedSuccess] = useState(null);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!token) {
        setError('No invitation token provided.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const data = await invitationService.getInvitationPreview(token);
        setPreview(data);
      } catch (err) {
        setError(err.message || 'Invitation link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [token]);

  const handleAccept = async () => {
    try {
      setAccepting(true);
      setError('');
      const res = await invitationService.acceptInvitation(token);
      
      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Ignore if confetti not supported
      }

      setJoinedSuccess(res);
      setTimeout(() => {
        if (onJoinedGroup && res.group?.id) {
          onJoinedGroup(res.group.id);
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const getCategoryEmoji = (category) => {
    const cat = GROUP_CATEGORIES.find((c) => c.id === category);
    return cat ? cat.emoji : '📁';
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        color: 'var(--text-muted)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem auto'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div>Checking invitation details...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '520px',
      margin: '3rem auto',
      padding: '0 1rem'
    }}>
      <div className="glass-card" style={{
        padding: '2.5rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {error ? (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(244, 63, 94, 0.15)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto'
            }}>
              <AlertCircle size={32} color="var(--accent-rose)" />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Invitation Unavailable
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
              {error}
            </p>
            <button
              type="button"
              onClick={() => onJoinedGroup ? onJoinedGroup(null) : window.location.href = '/'}
              className="btn btn-secondary"
              style={{ margin: '0 auto' }}
            >
              Go to Dashboard
            </button>
          </div>
        ) : joinedSuccess ? (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(16, 185, 129, 0.15)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto'
            }}>
              <CheckCircle size={32} color="var(--accent-emerald)" />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              You're In!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Welcome to <strong>{joinedSuccess.group?.name}</strong>. Redirecting to your group dashboard...
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              display: 'inline-block'
            }}>
              {getCategoryEmoji(preview?.group?.category)}
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              {preview?.group?.name}
            </h2>

            {preview?.group?.description && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                {preview.group.description}
              </p>
            )}

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.85rem',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.825rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.75rem'
            }}>
              <span>Invited by <strong>{preview?.invitedBy?.name}</strong></span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Users size={14} />
                {preview?.group?.memberCount} members
              </span>
            </div>

            {!user ? (
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Please sign in or create an account to join this expense group.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('pending_invite_token', token);
                      if (onNavigateAuth) onNavigateAuth('login');
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}
                  >
                    <LogIn size={18} />
                    <span>Log In to Join</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('pending_invite_token', token);
                      if (onNavigateAuth) onNavigateAuth('register');
                    }}
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}
                  >
                    <UserPlus size={18} />
                    <span>Create Free Account</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  You are signed in as <strong>{user.name}</strong> ({user.email}).
                </p>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={accepting}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '0.85rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                >
                  <span>{accepting ? 'Joining Group...' : `Join "${preview?.group?.name}"`}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
