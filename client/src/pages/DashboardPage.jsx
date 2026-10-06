import React, { useEffect, useState, useCallback } from 'react';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../services/analyticsService';
import { formatCurrency, formatDate, formatDateTime, getInitials } from '../utils/formatters';
import { GROUP_CATEGORIES, CATEGORIES } from '../utils/constants';
import {
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Search,
  Wallet,
  ChevronRight,
  Archive,
  RotateCcw,
  ShieldCheck,
  Crown,
  Receipt,
  CheckCircle2,
  History,
  TrendingUp,
  PieChart,
  RefreshCw,
  Sparkles,
  IndianRupee
} from 'lucide-react';

export const DashboardPage = ({ onSelectGroup, onOpenCreateGroup }) => {
  const { user } = useAuth();
  const { groups, globalSummary, fetchMyGroups, fetchGlobalSummary, loading } = useGroup();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [viewTab, setViewTab] = useState('active'); // 'active' | 'archived'
  
  // Dashboard Analytics state
  const [dashboardData, setDashboardData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [activityTab, setActivityTab] = useState('expenses'); // 'expenses' | 'settlements' | 'activity'

  const loadDashboardAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const res = await analyticsService.getDashboardAnalytics();
      setDashboardData(res.data || res);
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyGroups({ includeArchived: viewTab === 'archived' ? 'only' : 'false' });
    fetchGlobalSummary();
    loadDashboardAnalytics();
  }, [fetchMyGroups, fetchGlobalSummary, loadDashboardAnalytics, viewTab]);

  const filteredGroups = groups.filter((grp) => {
    const matchesSearch =
      grp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (grp.description && grp.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = filterCategory === 'All' || grp.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const currency = user?.defaultCurrency || 'INR';
  const totalPaid = dashboardData?.summary?.totalExpensesPaid ?? globalSummary?.totalExpensesPaid ?? 0;
  const totalOwed = dashboardData?.summary?.totalOwedToUser ?? globalSummary?.totalOwedToUser ?? 0;
  const totalOwes = dashboardData?.summary?.totalUserOwes ?? globalSummary?.totalUserOwes ?? 0;
  const netWorth = dashboardData?.summary?.globalNetBalance ?? globalSummary?.globalNetBalance ?? 0;

  const recentExpenses = dashboardData?.recentExpenses || [];
  const recentSettlements = dashboardData?.recentSettlements || [];
  const recentActivity = dashboardData?.recentActivity || [];
  const categorySpending = dashboardData?.categorySpending || [];

  const totalUserCategorySpend = categorySpending.reduce((acc, c) => acc + (c.userShareAmount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Welcome & Global Balance Overview */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
              Hi, <span className="text-gradient">{user?.name}</span> 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Here is your personal financial summary, active groups, and recent transactions
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => {
                fetchGlobalSummary();
                loadDashboardAnalytics();
                fetchMyGroups({ includeArchived: viewTab === 'archived' ? 'only' : 'false' });
              }}
              className="btn btn-ghost"
              title="Refresh Dashboard"
              style={{ padding: '0.55rem' }}
            >
              <RefreshCw size={18} className={analyticsLoading ? 'spin' : ''} />
            </button>
            <button
              onClick={onOpenCreateGroup}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <PlusCircle size={18} />
              <span>Create New Group</span>
            </button>
          </div>
        </div>

        {/* Global Financial Metric Cards (4 Grid) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem'
          }}
        >
          {/* Total Paid by You */}
          <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem'
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Total Paid by You
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(6, 182, 212, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <IndianRupee size={18} color="var(--accent-cyan)" />
              </div>
            </div>
            <div className="font-mono text-cyan" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              {formatCurrency(totalPaid, currency)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Lifetime upfront spending
            </div>
          </div>

          {/* Total Owed To You */}
          <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem'
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                You are Owed
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ArrowDownLeft size={18} color="var(--accent-emerald)" />
              </div>
            </div>
            <div className="font-mono text-emerald" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              +{formatCurrency(totalOwed, currency)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Receivable across all active groups
            </div>
          </div>

          {/* Total You Owe */}
          <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-rose)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem'
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                You Owe
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(244, 63, 94, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ArrowUpRight size={18} color="var(--accent-rose)" />
              </div>
            </div>
            <div className="font-mono text-rose" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              -{formatCurrency(totalOwes, currency)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Pending debts to settle up
            </div>
          </div>

          {/* Overall Net Balance */}
          <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem'
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Net Balance
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Wallet size={18} color="var(--accent-primary)" />
              </div>
            </div>
            <div
              className={`font-mono ${netWorth >= 0 ? 'text-emerald' : 'text-rose'}`}
              style={{ fontSize: '1.75rem', fontWeight: 800 }}
            >
              {netWorth >= 0 ? '+' : ''}
              {formatCurrency(netWorth, currency)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Overall financial standing
            </div>
          </div>
        </div>
      </div>

      {/* Groups Section */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Users size={22} color="var(--accent-primary)" />
              <span>{viewTab === 'active' ? 'Active Groups' : 'Archived Groups'}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                ({filteredGroups.length})
              </span>
            </h2>

            {/* View Mode Toggle: Active vs Archived */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--bg-secondary)',
                padding: '2px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                onClick={() => setViewTab('active')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  border: viewTab === 'active' ? '1px solid var(--border-medium)' : '1px solid transparent',
                  borderRadius: 'var(--radius-xs)',
                  background: viewTab === 'active' ? '#ffffff' : 'transparent',
                  color: viewTab === 'active' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: viewTab === 'active' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setViewTab('archived')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  border: viewTab === 'archived' ? '1px solid var(--border-medium)' : '1px solid transparent',
                  borderRadius: 'var(--radius-xs)',
                  background: viewTab === 'archived' ? '#ffffff' : 'transparent',
                  color: viewTab === 'archived' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: viewTab === 'archived' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Archived
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <input
                type="text"
                placeholder="Search groups..."
                className="form-input btn-sm"
                style={{ paddingLeft: '2.2rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search
                size={15}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>

            <select
              className="form-select btn-sm"
              style={{ width: 'auto' }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {GROUP_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Groups Grid */}
        {loading && groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading your expense groups...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto'
              }}
            >
              {viewTab === 'archived' ? (
                <Archive size={32} color="var(--accent-primary)" />
              ) : (
                <Users size={32} color="var(--accent-primary)" />
              )}
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {searchTerm
                ? 'No matching groups found'
                : viewTab === 'archived'
                ? 'No archived groups'
                : 'No expense groups yet'}
            </h3>
            <p
              style={{
                color: 'var(--text-secondary)',
                maxWidth: '420px',
                margin: '0 auto 1.5rem auto',
                fontSize: '0.9rem'
              }}
            >
              {searchTerm
                ? 'Try adjusting your search filter or category selection.'
                : viewTab === 'archived'
                ? 'When a group is archived, it will appear here.'
                : 'Create your first group for a trip, housemates, or dinner with friends!'}
            </p>
            {!searchTerm && viewTab === 'active' && (
              <button onClick={onOpenCreateGroup} className="btn btn-primary">
                <PlusCircle size={18} />
                <span>Create Group</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid-cols-auto">
            {filteredGroups.map((group) => {
              const catDef =
                GROUP_CATEGORIES.find((c) => c.id === group.category) || { emoji: '📂', label: 'Other' };
              const userBal = group.userNetBalance || 0;
              const isOwed = userBal > 0.01;
              const owes = userBal < -0.01;
              const userRole = group.userRole || 'member';

              return (
                <div
                  key={group._id}
                  onClick={() => onSelectGroup(group._id)}
                  className="glass-card glass-card-interactive"
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    position: 'relative'
                  }}
                >
                  <div>
                    {/* Top Tag & Role Badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.75rem'
                      }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>{catDef.emoji}</span>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {userRole === 'owner' ? (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(245, 158, 11, 0.2)',
                              color: 'var(--accent-amber)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem'
                            }}
                          >
                            <Crown size={12} /> Owner
                          </span>
                        ) : userRole === 'admin' ? (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(99, 102, 241, 0.2)',
                              color: 'var(--accent-primary-light)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem'
                            }}
                          >
                            <ShieldCheck size={12} /> Admin
                          </span>
                        ) : (
                          <span className="badge badge-indigo">
                            {group.members?.length || 1} members
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                      {group.name}
                    </h3>
                    {group.description && (
                      <p
                        style={{
                          fontSize: '0.825rem',
                          color: 'var(--text-secondary)',
                          lineClamp: 2,
                          overflow: 'hidden'
                        }}
                      >
                        {group.description}
                      </p>
                    )}
                  </div>

                  {/* Bottom Stats & Balance */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Your Balance</div>
                      <div
                        className={`font-mono ${
                          isOwed ? 'text-emerald' : owes ? 'text-rose' : 'text-secondary'
                        }`}
                        style={{ fontWeight: 700, fontSize: '0.95rem' }}
                      >
                        {isOwed
                          ? `+${formatCurrency(userBal, group.currency)}`
                          : owes
                          ? `-${formatCurrency(Math.abs(userBal), group.currency)}`
                          : 'Settled ($0.00)'}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: 'var(--accent-primary)',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      <span>View</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Financial Insights & Cross-Group Activity Section */}
      {groups.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.5rem',
            marginTop: '0.5rem'
          }}
        >
          {/* Left Column: Recent Activity Feed with Tabs */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} color="var(--accent-primary)" />
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Recent Activity & History</span>
              </div>

              {/* Activity Filter Tabs */}
              <div
                style={{
                  display: 'inline-flex',
                  background: 'var(--bg-secondary)',
                  padding: '2px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setActivityTab('expenses')}
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: activityTab === 'expenses' ? '1px solid var(--border-medium)' : '1px solid transparent',
                    borderRadius: 'var(--radius-xs)',
                    background: activityTab === 'expenses' ? '#ffffff' : 'transparent',
                    color: activityTab === 'expenses' ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: activityTab === 'expenses' ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Expenses ({recentExpenses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityTab('settlements')}
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: activityTab === 'settlements' ? '1px solid var(--border-medium)' : '1px solid transparent',
                    borderRadius: 'var(--radius-xs)',
                    background: activityTab === 'settlements' ? '#ffffff' : 'transparent',
                    color: activityTab === 'settlements' ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: activityTab === 'settlements' ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Settlements ({recentSettlements.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityTab('activity')}
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: activityTab === 'activity' ? '1px solid var(--border-medium)' : '1px solid transparent',
                    borderRadius: 'var(--radius-xs)',
                    background: activityTab === 'activity' ? '#ffffff' : 'transparent',
                    color: activityTab === 'activity' ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: activityTab === 'activity' ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Audit Log
                </button>
              </div>
            </div>

            {/* Tab 1: Recent Expenses */}
            {activityTab === 'expenses' && (
              <div>
                {recentExpenses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No recent expenses recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {recentExpenses.map((exp) => {
                      const catDef = CATEGORIES[exp.category] || { label: exp.category, emoji: '💳' };
                      const userSplit = exp.splits?.find((s) => s.userId?._id === user?._id || s.userId === user?._id);
                      const isPayer = (exp.paidBy?._id || exp.paidBy) === user?._id;

                      return (
                        <div
                          key={exp._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: '#ecfdf5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                flexShrink: 0
                              }}
                            >
                              {catDef.emoji}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {exp.description}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {exp.groupId?.name || 'Group'} • {formatDate(exp.expenseDate || exp.createdAt)} •{' '}
                                {isPayer ? 'You paid' : `${exp.paidBy?.name || 'Someone'} paid`}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div className="font-mono" style={{ fontSize: '0.925rem', fontWeight: 700 }}>
                              {formatCurrency(exp.totalAmount, exp.currency)}
                            </div>
                            {userSplit && (
                              <div
                                style={{
                                  fontSize: '0.725rem',
                                  color: isPayer ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                                }}
                              >
                                Your share: {formatCurrency(userSplit.amount, exp.currency)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Recent Settlements */}
            {activityTab === 'settlements' && (
              <div>
                {recentSettlements.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No recent settlements recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {recentSettlements.map((settle) => {
                      const isPayer = (settle.paidBy?._id || settle.paidBy) === user?._id;
                      const isReceiver = (settle.paidTo?._id || settle.paidTo) === user?._id;

                      return (
                        <div
                          key={settle._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <CheckCircle2 size={18} color="var(--accent-emerald)" />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                {isPayer
                                  ? `You paid ${settle.paidTo?.name || 'Member'}`
                                  : isReceiver
                                  ? `${settle.paidBy?.name || 'Member'} paid you`
                                  : `${settle.paidBy?.name || 'Member'} paid ${settle.paidTo?.name || 'Member'}`}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {settle.groupId?.name || 'Group'} • {formatDate(settle.settledAt || settle.createdAt)} •{' '}
                                {settle.paymentMethod || 'DIRECT_TRANSFER'}
                              </div>
                            </div>
                          </div>

                          <div className="font-mono text-emerald" style={{ fontSize: '1rem', fontWeight: 700 }}>
                            {formatCurrency(settle.amount, settle.currency || 'USD')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Recent Audit Log */}
            {activityTab === 'activity' && (
              <div>
                {recentActivity.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No audit logs available yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {recentActivity.map((log) => (
                      <div
                        key={log._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <History size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{log.summary}</span>
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                            {log.groupId?.name ? `${log.groupId.name} • ` : ''}
                            {formatDateTime(log.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Personal Spending Share by Category */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PieChart size={20} color="var(--accent-amber)" />
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Your Spending by Category</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Across All Groups</span>
            </div>

            {categorySpending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>No expense splits recorded yet.</p>
                <p style={{ fontSize: '0.775rem' }}>Add expenses to groups to see your category insights!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {categorySpending.map((cat) => {
                  const catDef = CATEGORIES[cat._id] || { label: cat._id, emoji: '💳', color: '#6366f1' };
                  const percent =
                    totalUserCategorySpend > 0
                      ? Math.round((cat.userShareAmount / totalUserCategorySpend) * 100)
                      : 0;

                  return (
                    <div key={cat._id}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.35rem',
                          fontSize: '0.85rem'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                          <span>{catDef.emoji}</span>
                          <span>{catDef.label}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            ({cat.count} {cat.count === 1 ? 'expense' : 'expenses'})
                          </span>
                        </span>

                        <span className="font-mono" style={{ fontWeight: 700 }}>
                          {formatCurrency(cat.userShareAmount, currency)} ({percent}%)
                        </span>
                      </div>

                      {/* Visual progress bar */}
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          background: 'var(--border-subtle)',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: '100%',
                            background: 'var(--accent-primary)',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem'
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>Total Personal Share:</span>
                  <span className="font-mono text-cyan" style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                    {formatCurrency(totalUserCategorySpend, currency)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

