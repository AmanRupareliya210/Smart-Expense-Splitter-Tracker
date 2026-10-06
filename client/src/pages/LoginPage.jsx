import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, Mail, AlertCircle, Zap, Shield, Sparkles } from 'lucide-react';

export const LoginPage = ({ onNavigate }) => {
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email, password);
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLoginAman = async () => {
    try {
      setQuickLoading(true);
      setError('');
      await quickLogin();
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '2.5rem auto', padding: '0 1rem' }}>
      <div className="glass-card" style={{ padding: '2.25rem 2rem' }}>
        {/* App Logo & Brand at top */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img 
              src="/logo.svg" 
              alt="Smart Expense Logo" 
              style={{ width: '48px', height: '48px', borderRadius: '12px' }} 
            />
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Welcome Back
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Sign in to track and split your group expenses
          </p>
        </div>

        {/* ONE-TAP DIRECT LOGIN AS ADMIN AMAN BUTTON */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={handleQuickLoginAman}
            disabled={quickLoading || loading}
            className="btn"
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              background: '#ecfdf5',
              border: '1.5px solid #10b981',
              color: '#047857',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              fontWeight: 700,
              fontSize: '0.925rem',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Zap size={18} color="#059669" className={quickLoading ? 'spin' : ''} />
            <span>{quickLoading ? 'Logging in as Aman...' : '⚡ One-Tap Login as Admin (Aman)'}</span>
          </button>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#047857', 
            textAlign: 'center', 
            marginTop: '0.4rem',
            fontWeight: 500 
          }}>
            Account: <strong>aman@gmail.com</strong> (Pass: <code>Password@123</code>)
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            or with email
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-rose)',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || quickLoading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
          >
            <LogIn size={18} />
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <button
            onClick={() => onNavigate('register')}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Create one
          </button>
        </div>
      </div>
    </div>
  );
};
