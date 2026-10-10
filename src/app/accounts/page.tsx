'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  FileText,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  Plus,
  BookMarked,
  ListOrdered,
  BookOpen,
  Scale,
  BarChart2,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDualCurrency, DEFAULT_USD_TO_PKR_RATE } from '@/lib/currency';

export default function AccountsDashboardPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [usdToPkrRate, setUsdToPkrRate] = useState<number>(DEFAULT_USD_TO_PKR_RATE);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, payRes, subsRes, plansRes, rateRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/payments'),
        fetch('/api/subscriptions'),
        fetch('/api/plans'),
        fetch('/api/exchange-rate').catch(() => null),
      ]);

      const [invJson, payJson, subsJson, plansJson] = await Promise.all([
        invRes.json(),
        payRes.json(),
        subsRes.json(),
        plansRes.json(),
      ]);

      setInvoices(invJson.invoices || []);
      setPayments(payJson.payments || []);
      setSubscriptions(subsJson.subscriptions || []);
      setPlans(plansJson.plans || []);

      if (rateRes && rateRes.ok) {
        const rateJson = await rateRes.json();
        if (rateJson.usdToPkr && rateJson.usdToPkr > 0) {
          setUsdToPkrRate(rateJson.usdToPkr);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── Computed Metrics ── */
  const metrics = useMemo(() => {
    const activeSubs = subscriptions.filter((s) => s.status === 'active');
    const mrr = activeSubs.reduce((sum, s) => {
      let monthly = Number(s.price_pkr) || 0;
      if (s.billing_cycle === 'quarterly') monthly /= 3;
      if (s.billing_cycle === 'annual') monthly /= 12;
      return sum + monthly;
    }, 0);

    const validInvoices = invoices.filter((i) => i.status !== 'cancelled');
    const totalAr = validInvoices.reduce((sum, i) => sum + (Number(i.balance_pkr) || 0), 0);
    const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount_pkr) || 0), 0);
    const overdueInvoices = validInvoices.filter((i) => i.status === 'overdue');

    return {
      mrr,
      totalAr,
      totalCollected,
      activeSubsCount: activeSubs.length,
      overdueCount: overdueInvoices.length,
    };
  }, [subscriptions, invoices, payments]);

  return (
    <div className="accounts-page">
      {/* ── Page Header ── */}
      <div className="accounts-page-header">
        <div className="accounts-page-title">
          <div className="accounts-page-icon">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h1>Accounts Dashboard</h1>
            <p>Financial executive overview, recurring subscriptions & cash collections</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div className="currency-toggle-wrapper">
            <button
              className={`currency-toggle-btn ${currency === 'PKR' ? 'active' : ''}`}
              onClick={() => setCurrency('PKR')}
            >
              PKR (Rs)
            </button>
            <button
              className={`currency-toggle-btn ${currency === 'USD' ? 'active' : ''}`}
              onClick={() => setCurrency('USD')}
            >
              USD ($)
            </button>
          </div>

          <span
            style={{
              fontSize: '0.72rem',
              color: 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <TrendingUp size={12} color="#fbbf24" />
            1 USD = {usdToPkrRate.toFixed(2)} PKR
          </span>
        </div>
      </div>

      {/* ── Quick Action Shortcuts ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <button
          className="btn-accounts-ghost"
          style={{ justifyContent: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.06)' }}
          onClick={() => router.push('/accounts/subscriptions')}
        >
          <Users size={16} color="#38bdf8" /> Subscriptions
        </button>

        <button
          className="btn-accounts-ghost"
          style={{ justifyContent: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.06)' }}
          onClick={() => router.push('/accounts/invoices')}
        >
          <FileText size={16} color="#fbbf24" /> Invoices
        </button>

        <button
          className="btn-accounts-ghost"
          style={{ justifyContent: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.06)' }}
          onClick={() => router.push('/accounts/payments')}
        >
          <CreditCard size={16} color="#4ade80" /> Payments
        </button>

        <button
          className="btn-accounts-ghost"
          style={{ justifyContent: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.06)' }}
          onClick={() => router.push('/accounts/plans')}
        >
          <BookMarked size={16} color="#c084fc" /> Health Plans
        </button>

        <button
          className="btn-accounts-ghost"
          style={{ justifyContent: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.06)' }}
          onClick={() => router.push('/accounts/chart-of-accounts')}
        >
          <ListOrdered size={16} color="#f472b6" /> Chart of Accounts
        </button>
      </div>

      {/* ── Key Metrics ── */}
      <div className="accounts-metrics-grid">
        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val" style={{ color: '#4ade80' }}>
              {formatCurrency(metrics.mrr, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Monthly Recurring Revenue (MRR)</div>
          </div>
          <div className="accounts-metric-icon">
            <TrendingUp size={20} color="#4ade80" />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val" style={{ color: '#67e8f9' }}>
              {formatCurrency(metrics.totalCollected, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Total Cash & Bank Collections</div>
          </div>
          <div className="accounts-metric-icon">
            <DollarSign size={20} color="#67e8f9" />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val" style={{ color: '#fbbf24' }}>
              {formatCurrency(metrics.totalAr, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Accounts Receivable (Outstanding)</div>
          </div>
          <div className="accounts-metric-icon">
            <Clock size={20} color="#fbbf24" />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">{metrics.activeSubsCount}</div>
            <div className="accounts-metric-lbl">Active Subscribed Patients</div>
          </div>
          <div className="accounts-metric-icon">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* ── 2-Column Activity Overview ── */}
      {loading ? (
        <div className="accounts-empty-state">
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
          <h3>Loading dashboard analytics…</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          {/* Recent Invoices Card */}
          <div className="accounts-table-wrapper" style={{ padding: '20px', background: '#0a233c' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#fbbf24" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Recent Invoices</h3>
              </div>
              <button
                className="btn-accounts-ghost"
                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                onClick={() => router.push('/accounts/invoices')}
              >
                View All <ChevronRight size={12} />
              </button>
            </div>

            {invoices.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', padding: '16px 0', textAlign: 'center' }}>
                No invoices created yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {invoices.slice(0, 5).map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div>
                      <strong style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '0.82rem' }}>
                        {inv.invoice_number}
                      </strong>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                        {inv.subscriber?.name || 'Subscriber'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#ffffff' }}>
                        {formatCurrency(inv.total_pkr, currency, usdToPkrRate)}
                      </strong>
                      <div style={{ fontSize: '0.7rem', color: Number(inv.balance_pkr) > 0 ? '#f87171' : '#4ade80' }}>
                        {Number(inv.balance_pkr) > 0 ? `Due: ${formatCurrency(inv.balance_pkr, currency, usdToPkrRate)}` : 'Paid ✓'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Payments Card */}
          <div className="accounts-table-wrapper" style={{ padding: '20px', background: '#0a233c' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#4ade80" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Recent Collections</h3>
              </div>
              <button
                className="btn-accounts-ghost"
                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                onClick={() => router.push('/accounts/payments')}
              >
                View All <ChevronRight size={12} />
              </button>
            </div>

            {payments.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', padding: '16px 0', textAlign: 'center' }}>
                No collections recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payments.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div>
                      <strong style={{ fontFamily: 'monospace', color: '#4ade80', fontSize: '0.82rem' }}>
                        {p.payment_number}
                      </strong>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                        {p.subscriber?.name || 'Subscriber'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#4ade80' }}>
                        +{formatCurrency(p.amount_pkr, currency, usdToPkrRate)}
                      </strong>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                        {p.payment_method.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
