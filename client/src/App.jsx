import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GroupProvider } from './context/GroupContext';
import { NotificationProvider } from './context/NotificationContext';

// Components & Pages
import { Navbar } from './components/common/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { CreateGroupModal } from './components/group/CreateGroupModal';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'landing' | 'login' | 'register' | 'dashboard' | 'group-detail' | 'join-invite'
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

  // Check URL path or query parameter for invitation token on initial mount
  useEffect(() => {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    // Support /join/:token or /invite/:token or ?token=... or ?invite=...
    if (pathname.startsWith('/join/')) {
      const token = pathname.replace('/join/', '').split('/')[0];
      if (token) {
        setInviteToken(token);
        setCurrentPage('join-invite');
      }
    } else if (pathname.startsWith('/invite/')) {
      const token = pathname.replace('/invite/', '').split('/')[0];
      if (token) {
        setInviteToken(token);
        setCurrentPage('join-invite');
      }
    } else if (searchParams.get('token') || searchParams.get('invite')) {
      const token = searchParams.get('token') || searchParams.get('invite');
      setInviteToken(token);
      setCurrentPage('join-invite');
    } else {
      // Check localStorage for saved pending invite after login/register
      const savedToken = localStorage.getItem('pending_invite_token');
      if (savedToken) {
        setInviteToken(savedToken);
        localStorage.removeItem('pending_invite_token');
        setCurrentPage('join-invite');
      }
    }
  }, []);

  // When user logs in, if there's a saved token in localStorage, bring them to invite page
  useEffect(() => {
    if (user) {
      const savedToken = localStorage.getItem('pending_invite_token');
      if (savedToken) {
        setInviteToken(savedToken);
        localStorage.removeItem('pending_invite_token');
        setCurrentPage('join-invite');
      }
    }
  }, [user]);

  // Navigate handler
  const handleNavigate = (page) => {
    setCurrentPage(page);
    if (page !== 'group-detail') {
      setSelectedGroupId(null);
    }
  };

  const handleSelectGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setCurrentPage('group-detail');
  };

  const handleJoinedGroup = (groupId) => {
    if (groupId) {
      setSelectedGroupId(groupId);
      setCurrentPage('group-detail');
    } else {
      setCurrentPage('dashboard');
    }
    setInviteToken(null);
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: 'var(--text-muted)'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTopColor: 'var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem auto'
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div>Initializing Smart Expense Splitter...</div>
        </div>
      </div>
    );
  }

  // Routing Logic
  let pageComponent;

  if (currentPage === 'join-invite' && inviteToken) {
    pageComponent = (
      <AcceptInvitePage
        token={inviteToken}
        onJoinedGroup={handleJoinedGroup}
        onNavigateAuth={(authPage) => setCurrentPage(authPage)}
      />
    );
  } else if (!user) {
    if (currentPage === 'register') {
      pageComponent = <RegisterPage onNavigate={handleNavigate} />;
    } else if (currentPage === 'login') {
      pageComponent = <LoginPage onNavigate={handleNavigate} />;
    } else {
      pageComponent = <LandingPage onNavigate={handleNavigate} />;
    }
  } else {
    if (currentPage === 'group-detail' && selectedGroupId) {
      pageComponent = (
        <GroupDetailPage
          groupId={selectedGroupId}
          onBack={() => handleNavigate('dashboard')}
        />
      );
    } else {
      pageComponent = (
        <DashboardPage
          onSelectGroup={handleSelectGroup}
          onOpenCreateGroup={() => setIsCreateGroupModalOpen(true)}
        />
      );
    }
  }

  return (
    <div className="app-container">
      <Navbar
        onOpenCreateGroup={() => setIsCreateGroupModalOpen(true)}
        onNavigate={handleNavigate}
        onNavigateToGroup={handleSelectGroup}
        currentPage={currentPage}
      />

      <main className="main-content">{pageComponent}</main>

      {/* Global Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onGroupCreated={(group) => {
          setIsCreateGroupModalOpen(false);
          handleSelectGroup(group._id);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <GroupProvider>
          <AppContent />
        </GroupProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
