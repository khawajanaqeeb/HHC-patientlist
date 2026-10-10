'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart2,
  TrendingUp,
  Loader2,
  Users,
  CreditCard,
  DollarSign,
  PieChart,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDualCurrency, DEFAULT_USD_TO_PKR_RATE } from '@/lib/currency';

interface Subscription {
  id: string;
  subscription_code: string;
  plan_id: number;
  plan_name: string;
  billing_cycle: string;
  price_pkr: number;
  status: string;
  start_date: string;
  subscriber?: { name: string };
  patient?: { name: string; patient_code: string };
}

interface Plan {
  id: number;
  name: string;
  price: number;
  billing_cycle?: string;
}

export default function MRRDashboardPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [usdToPkrRate, setUsdToPkrRate] = useState<number>(DEFAULT_USD_TO_PKR_RATE);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subsRes, plansRes, rateRes] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/plans'),
        fetch('/api/exchange-rate').catch(() => null),
      ]);

      const subsJson = await subsRes.json();
      setSubscriptions(subsJson.subscriptions || []);

      const plansJson = await plansRes.json();
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

  /* ── Calculations ── */
  const activeSubs = useMemo(() => {
    return subscriptions.filter((s) => s.status === 'active');
  }, [subscriptions]);

  const metrics = useMemo(() => {
    const totalMRR = activeSubs.reduce((sum, s) => {
      let monthly = Number(s.price_pkr) || 0;
      if (s.billing_cycle === 'quarterly') monthly /= 3;
      if (s.billing_cycle === 'annual') monthly /= 12;
      return sum + monthly;
    }, 0);

    const totalARR = totalMRR * 12;
    const arpu = activeSubs.length > 0 ? totalMRR / activeSubs.length : 0;

    return { totalMRR, totalARR, arpu, activeCount: activeSubs.length };
  }, [activeSubs]);

  // Breakdown by Plan
  const planBreakdown = useMemo(() => {
    const map = new Map<string, { planName: string; count: number; mrr: number }>();

    activeSubs.forEach((s) => {
      const name = s.plan_name || 'Health Plan';
      let monthly = Number(s.price_pkr) || 0;
      if (s.billing_cycle === 'quarterly') monthly /= 3;
      if (s.billing_cycle === 'annual') monthly /= 12;

      const current = map.get(name) || { planName: name, count: 0, mrr: 0 };
      current.count += 1;
      current.mrr += monthly;
      map.set(name, current);
    });

    return Array.from(map.values()).sort((a, b) => b.mrr - a.mrr);
  }, [activeSubs]);

  return (
    <div className="accounts-page">
      {/* ── Page Header ── */}
      <div className="accounts-page-header">
        <div className="accounts-page-title">
          <div className="accounts-page-icon">
            <BarChart2 size={22} />
          </div>
          <div>
            <h1>MRR Dashboard</h1>
            <p>Monthly Recurring Revenue, Annual Run Rate & Subscription Plan Analytics</p>
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

          <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)' }}>
            1 USD = {usdToPkrRate.toFixed(2)} PKR
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="accounts-empty-state">
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
          <h3>Loading MRR analytics…</h3>
        </div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <div className="accounts-metrics-grid">
            <div className="accounts-metric-card">
              <div>
                <div className="accounts-metric-val" style={{ color: '#4ade80' }}>
                  {formatCurrency(metrics.totalMRR, currency, usdToPkrRate)}
                </div>
                <div className="accounts-metric-lbl">Monthly Recurring Revenue (MRR)</div>
              </div>
              <div className="accounts-metric-icon">
                <CreditCard size={20} color="#4ade80" />
              </div>
            </div>

            <div className="accounts-metric-card">
              <div>
                <div className="accounts-metric-val" style={{ color: '#67e8f9' }}>
                  {formatCurrency(metrics.totalARR, currency, usdToPkrRate)}
                </div>
                <div className="accounts-metric-lbl">Annual Run Rate (ARR)</div>
              </div>
              <div className="accounts-metric-icon">
                <TrendingUp size={20} color="#67e8f9" />
              </div>
            </div>

            <div className="accounts-metric-card">
              <div>
                <div className="accounts-metric-val" style={{ color: '#fbbf24' }}>
                  {formatCurrency(metrics.arpu, currency, usdToPkrRate)}
                </div>
                <div className="accounts-metric-lbl">Average Revenue Per User (ARPU)</div>
              </div>
              <div className="accounts-metric-icon">
                <Users size={20} color="#fbbf24" />
              </div>
            </div>

            <div className="accounts-metric-card">
              <div>
                <div className="accounts-metric-val">{metrics.activeCount}</div>
                <div className="accounts-metric-lbl">Active Subscribed Patients</div>
              </div>
              <div className="accounts-metric-icon">
                <Layers size={20} />
              </div>
            </div>
          </div>

          {/* ── Breakdown by Plan ── */}
          <div className="accounts-table-wrapper" style={{ padding: '24px', background: '#0a233c', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24', marginBottom: '16px' }}>
              MRR Contribution by Health Plan
            </h2>

            {planBreakdown.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', padding: '16px 0', textAlign: 'center' }}>
                No active subscriptions yet to calculate MRR contribution.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {planBreakdown.map((p) => {
                  const percent = metrics.totalMRR > 0 ? Math.round((p.mrr / metrics.totalMRR) * 100) : 0;
                  return (
                    <div key={p.planName} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 18px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <strong style={{ fontSize: '0.92rem', color: '#ffffff' }}>{p.planName}</strong>
                          <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', marginLeft: '8px' }}>
                            {p.count} active subscription{p.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ color: '#4ade80', fontSize: '0.95rem' }}>
                            {formatCurrency(p.mrr, currency, usdToPkrRate)} / mo
                          </strong>
                          <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', marginLeft: '8px' }}>
                            ({percent}% of MRR)
                          </span>
                        </div>
                      </div>

                      <div style={{ height: '7px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${percent}%`,
                            background: 'linear-gradient(90deg, #38bdf8, #4ade80)',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
