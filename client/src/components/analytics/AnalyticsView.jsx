import React, { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { formatCurrency } from '../../utils/formatters';
import { CATEGORIES } from '../../utils/constants';
import {
  PieChart,
  TrendingUp,
  Users,
  IndianRupee,
  Calendar,
  BarChart3,
  Receipt,
  RotateCcw
} from 'lucide-react';

export const AnalyticsView = ({ groupId, currency = 'INR' }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all'); // 'all' | 'this_month' | 'last_30_days' | 'last_90_days' | 'this_year' | 'custom'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (timeRange === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      } else if (timeRange !== 'all') {
        params.timeRange = timeRange;
      }
      if (categoryFilter && categoryFilter !== 'All') {
        params.category = categoryFilter;
      }

      const res = await analyticsService.getGroupAnalytics(groupId, params);
      setAnalytics(res.data || res);
    } catch (err) {
      console.error('Failed to load group analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, timeRange, categoryFilter, startDate, endDate]);

  useEffect(() => {
    if (groupId) {
      fetchStats();
    }
  }, [groupId, fetchStats]);

  const summary = analytics?.summary || { totalSpending: 0, expenseCount: 0, avgExpenseAmount: 0 };
  const categoryStats = analytics?.categoryStats || [];
  const monthlyStats = analytics?.monthlyStats || [];
  const payerStats = analytics?.payerStats || [];
  const totalSpend = summary.totalSpending || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filter Control Header */}
      <div
        className="glass-card"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        {/* Time Range Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Calendar size={14} /> Timeframe:
          </span>
          {[
            { id: 'all', label: 'All Time' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_30_days', label: 'Last 30 Days' },
            { id: 'last_90_days', label: 'Last 90 Days' },
            { id: 'this_year', label: 'This Year' },
            { id: 'custom', label: 'Custom' }
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setTimeRange(chip.id)}
              className={`btn btn-sm ${timeRange === chip.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Category Filter & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {timeRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input btn-sm"
                style={{ fontSize: '0.78rem', width: '130px' }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input btn-sm"
                style={{ fontSize: '0.78rem', width: '130px' }}
              />
            </div>
          )}

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="form-select btn-sm"
            style={{ fontSize: '0.8rem', width: 'auto' }}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {(timeRange !== 'all' || categoryFilter !== 'All' || startDate || endDate) && (
            <button
              onClick={() => {
                setTimeRange('all');
                setCategoryFilter('All');
                setStartDate('');
                setEndDate('');
              }}
              className="btn btn-sm btn-ghost"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
              title="Reset Filters"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Calculating financial insights...
        </div>
      ) : (
        <>
          {/* Overview Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <IndianRupee size={18} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Window Spending</span>
              </div>
              <div className="font-mono" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {formatCurrency(totalSpend, currency)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                Across {summary.expenseCount || 0} recorded expense{summary.expenseCount === 1 ? '' : 's'}
              </div>
            </div>

            <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <Receipt size={18} color="var(--accent-secondary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Average Expense</span>
              </div>
              <div className="font-mono" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {formatCurrency(summary.avgExpenseAmount || 0, currency)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                Per bill in selected timeframe
              </div>
            </div>

            <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <Users size={18} color="var(--accent-emerald)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Contributors</span>
              </div>
              <div className="font-mono" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {payerStats.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                Members who paid upfront
              </div>
            </div>
          </div>

          {/* Category Breakdown & Payer Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {/* Category Breakdown */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <PieChart size={18} color="var(--accent-primary)" />
                <span>Spending by Category</span>
              </h3>

              {categoryStats.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                  No expense records match the selected filter.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  {categoryStats.map((item) => {
                    const catDef = CATEGORIES.find((c) => c.id.toLowerCase() === item.category.toLowerCase()) || {
                      label: item.category,
                      color: '#6366f1'
                    };
                    const percent = item.percentage;
                    return (
                      <div key={item.category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: catDef.color, display: 'inline-block' }} />
                            {catDef.label} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({item.count} bill{item.count === 1 ? '' : 's'})</span>
                          </span>
                          <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatCurrency(item.totalAmount, currency)} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>({percent}%)</span>
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: catDef.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payer Contribution Distribution */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <TrendingUp size={18} color="var(--accent-emerald)" />
                <span>Upfront Payer Distribution</span>
              </h3>

              {payerStats.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                  No payment records found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  {payerStats.map((payer) => {
                    const percent = payer.percentage;
                    return (
                      <div key={payer.userId}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {payer.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({payer.count} payment{payer.count === 1 ? '' : 's'})</span>
                          </span>
                          <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatCurrency(payer.totalAmount, currency)} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>({percent}%)</span>
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: 'var(--gradient-emerald)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Monthly / Timeline Trends */}
          {monthlyStats.length > 0 && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <BarChart3 size={18} color="var(--accent-primary)" />
                <span>Monthly Expense Trajectory</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(monthlyStats.length, 1)}, 1fr)`, gap: '1rem', alignItems: 'flex-end', minHeight: '140px', padding: '1rem 0' }}>
                {monthlyStats.map((m) => {
                  const maxMonthSpend = Math.max(...monthlyStats.map((s) => s.totalAmount)) || 1;
                  const barHeight = Math.max(15, Math.round((m.totalAmount / maxMonthSpend) * 100));
                  return (
                    <div key={`${m.year}-${m.month}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatCurrency(m.totalAmount, currency)}
                      </span>
                      <div style={{ width: '100%', maxWidth: '50px', height: `${barHeight}px`, background: 'var(--gradient-primary)', borderRadius: '6px', transition: 'height 0.5s ease' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
