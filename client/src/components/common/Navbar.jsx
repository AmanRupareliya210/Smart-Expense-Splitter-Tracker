import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/formatters';
import { NotificationDropdown } from '../notification/NotificationDropdown';
import { 
  Split, 
  LogOut, 
  User as UserIcon, 
  PlusCircle, 
  Sparkles,
  ChevronDown,
  Layers
} from 'lucide-react';

export const Navbar = ({ onOpenCreateGroup, onNavigate, onNavigateToGroup, currentPage }) => {
  const { user, logout, quickLogin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: '#ffffff',
      boxShadow: 'var(--shadow-sm)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand Logo with Image beside App Name */}
        <div 
          onClick={() => onNavigate('dashboard')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <img
            src="/logo.svg"
            alt="Smart Expense Logo"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              display: 'block'
            }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
              <span>Smart Expense</span>
              <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '6px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 700 }}>
                PRO
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Splitter & Debt Minimizer</div>
          </div>
        </div>

        {/* Navigation Actions */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button
              onClick={() => onNavigate('dashboard')}
              className={`btn btn-sm ${currentPage === 'dashboard' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Layers size={16} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={onOpenCreateGroup}
              className="btn btn-sm btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <PlusCircle size={16} />
              <span>New Group</span>
            </button>

            {/* In-App Notification Center Dropdown */}
            <NotificationDropdown onNavigateToGroup={onNavigateToGroup} />

            {/* User Profile dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: '#ffffff',
                  border: '1px solid var(--border-medium)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--gradient-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: '#ffffff'
                }}>
                  {getInitials(user.name)}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</span>
                <ChevronDown size={14} color="var(--text-muted)" />
              </button>

              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  marginTop: '0.5rem',
                  width: '220px',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-xl)',
                  padding: '0.5rem',
                  zIndex: 110,
                  animation: 'fadeIn 0.15s ease'
                }}>
                  <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-rose)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      marginTop: '0.25rem',
                      fontWeight: 600
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fff1f2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              onClick={async () => {
                try {
                  await quickLogin();
                  onNavigate('dashboard');
                } catch (err) {
                  onNavigate('login');
                }
              }}
              className="btn btn-sm"
              style={{
                background: '#ecfdf5',
                color: '#047857',
                border: '1.5px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 700
              }}
              title="One-tap direct login as Admin Aman"
            >
              <span>⚡ One-Tap Login (Aman)</span>
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="btn btn-sm btn-ghost"
            >
              Log In
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="btn btn-sm btn-primary"
            >
              Get Started
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
