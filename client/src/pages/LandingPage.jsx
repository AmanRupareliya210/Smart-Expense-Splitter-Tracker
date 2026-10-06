import React, { useState } from 'react';
import { Split, Zap, Shield, PieChart, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage = ({ onNavigate }) => {
  const { quickLogin } = useAuth();
  const [loadingAman, setLoadingAman] = useState(false);

  const handleQuickLogin = async () => {
    try {
      setLoadingAman(true);
      await quickLogin();
      onNavigate('dashboard');
    } catch (err) {
      onNavigate('login');
    } finally {
      setLoadingAman(false);
    }
  };

  return (
    <div style={{ padding: '2rem 0' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', maxWidth: '820px', margin: '2rem auto 3.5rem auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <img
            src="/logo.svg"
            alt="Smart Expense Logo"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)'
            }}
          />
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1rem',
          borderRadius: 'var(--radius-full)',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#047857',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '1.25rem'
        }}>
          <Zap size={15} color="#10b981" />
          <span>Next-Gen Smart Expense Splitting & Debt Minimizer</span>
        </div>

        <h1 style={{ fontSize: '3.25rem', lineHeight: 1.15, fontWeight: 800, marginBottom: '1.25rem', color: '#0f172a' }}>
          Split Bills Effortlessly. <br />
          <span style={{
            background: 'linear-gradient(135deg, #10b981 0%, #2563eb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Settle Debts in Minimum Steps.</span>
        </h1>

        <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto 2.25rem auto' }}>
          Track shared trips, housemates bills, and projects. Our smart graph reduction engine automatically minimizes circular debts so everyone pays with zero confusion.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleQuickLogin}
            disabled={loadingAman}
            className="btn btn-lg"
            style={{
              background: '#ecfdf5',
              color: '#047857',
              border: '2px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
            }}
            title="Instant one-tap login as Admin Aman"
          >
            <span>{loadingAman ? 'Logging in...' : '⚡ One-Tap Login (Aman)'}</span>
          </button>
          <button
            onClick={() => onNavigate('register')}
            className="btn btn-primary btn-lg"
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}
          >
            <span>Start Splitting for Free</span>
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => onNavigate('login')}
            className="btn btn-secondary btn-lg"
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '3rem' }}>
        <div className="glass-card">
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <Zap size={24} color="var(--accent-primary)" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Greedy Debt Minimization
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Transforms complex web of $O(N^2)$ circular debts into at most $N-1$ direct transactions with mathematical precision.
          </p>
        </div>

        <div className="glass-card">
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <Split size={24} color="var(--accent-emerald)" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            4 Flexible Split Modes
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Split equally (with remainder pennies distributed), by exact dollar amounts, percentage breakdown, or weighted share units.
          </p>
        </div>

        <div className="glass-card">
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(236, 72, 153, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <PieChart size={24} color="var(--accent-secondary)" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Real-Time Analytics & Audit
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Gain clear visibility into spending categories, highest contributors, and full historical timeline of transactions.
          </p>
        </div>
      </div>
    </div>
  );
};
