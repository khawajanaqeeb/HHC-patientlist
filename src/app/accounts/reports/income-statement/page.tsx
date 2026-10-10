'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  Loader2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Printer,
} from 'lucide-react';
import { formatCurrency, formatDualCurrency, DEFAULT_USD_TO_PKR_RATE } from '@/lib/currency';

export default function IncomeStatementPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [usdToPkrRate, setUsdToPkrRate] = useState<number>(DEFAULT_USD_TO_PKR_RATE);

  const loadData = async () => {
    try {
      setLoading(true);
      const [res, rateRes] = await Promise.all([
        fetch(`/api/reports/income-statement?startDate=${startDate}&endDate=${endDate}`),
        fetch('/api/exchange-rate').catch(() => null),
      ]);

      const json = await res.json();
      setData(json);

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
  }, [startDate, endDate]);

  return (
    <div className="accounts-page">
      {/* ── Page Header ── */}
      <div className="accounts-page-header">
        <div className="accounts-page-title">
          <div className="accounts-page-icon">
            <TrendingUp size={22} />
          </div>
          <div>
            <h1>Income Statement (P&L)</h1>
            <p>Revenues, cost of clinical care, operating expenses & net profit</p>
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

          <button className="btn-accounts-ghost" onClick={() => window.print()}>
            <Printer size={14} /> Print Statement
          </button>
        </div>
      </div>

      {/* ── Period Selector Bar ── */}
      <div className="accounts-controls-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Date Range:</span>
          <input
            type="date"
            className="accounts-form-input"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>to</span>
          <input
            type="date"
            className="accounts-form-input"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)' }}>
          1 USD = {usdToPkrRate.toFixed(2)} PKR
        </span>
      </div>

      {/* ── Content ── */}
      {loading || !data ? (
        <div className="accounts-empty-state">
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
          <h3>Generating Income Statement…</h3>
        </div>
      ) : (
        <>
          {/* ── Summary KPI Cards ── */}
          <div className="accounts-metrics-grid">
            <div className="accounts-metric-card">
              <div>
                <div className="accounts-metric-val" style={{ color: '#4ade80' }}>
                  {formatCurrency(data.totalRevenue, currency, usdToPkrRate)}
                </div>
                <div className="accounts-metric-lbl">Total Operating Revenue</div>
              </div>
              <div className="accounts-metric-icon">
                <ArrowUpRight size={20} color="#4ade80" />
              </div>
            </div>

            <div className="accounts-metric-card">
              <div>
                <div className="accounts-metric-val" style={{ color: '#67e8f9' }}>
                  {formatCurrency(data.grossProfit, currency, usdToPkrRate)}
                </div>
                <div className="accounts-metric-lbl">Gross Profit</div>
              </div>
              <div className="accounts-metric-icon">
                <Sparkles size={20} color="#67e8f9" />
              </div>
            </div>

            <div className="accounts-metric-card">
              <div>
                <div className="accounts-metric-val" style={{ color: '#f87171' }}>
                  {formatCurrency(data.totalOperatingExpenses, currency, usdToPkrRate)}
                </div>
                <div className="accounts-metric-lbl">Total Operating Expenses</div>
              </div>
              <div className="accounts-metric-icon">
                <ArrowDownRight size={20} color="#f87171" />
              </div>
            </div>

            <div className="accounts-metric-card">
              <div>
                <div
                  className="accounts-metric-val"
                  style={{ color: data.netProfit >= 0 ? '#fbbf24' : '#ef4444' }}
                >
                  {formatCurrency(data.netProfit, currency, usdToPkrRate)}
                </div>
                <div className="accounts-metric-lbl">Net Profit / (Loss)</div>
              </div>
              <div className="accounts-metric-icon">
                <DollarSign size={20} color={data.netProfit >= 0 ? '#fbbf24' : '#ef4444'} />
              </div>
            </div>
          </div>

          {/* ── Itemized Statement Card ── */}
          <div className="accounts-table-wrapper" style={{ padding: '24px', background: '#0a233c' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px', color: '#fbbf24' }}>
              Statement of Profit and Loss
            </h2>

            {/* REVENUE SECTION */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '4px' }}>
                Revenues
              </div>
              {data.revenues.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', padding: '6px 0' }}>No revenue recorded in this period.</div>
              ) : (
                data.revenues.map((r: any) => (
                  <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span>{r.code} — {r.name}</span>
                    <strong>{formatCurrency(r.amount, currency, usdToPkrRate)}</strong>
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.9rem', fontWeight: 700, color: '#4ade80', marginTop: '4px' }}>
                <span>Total Revenue</span>
                <span>{formatCurrency(data.totalRevenue, currency, usdToPkrRate)}</span>
              </div>
            </div>

            {/* COST OF SERVICES */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fb923c', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '4px' }}>
                Cost of Clinical Services
              </div>
              {data.costOfServices.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', padding: '6px 0' }}>No clinical service costs recorded.</div>
              ) : (
                data.costOfServices.map((c: any) => (
                  <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span>{c.code} — {c.name}</span>
                    <span>({formatCurrency(c.amount, currency, usdToPkrRate)})</span>
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.9rem', fontWeight: 700, color: '#67e8f9', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span>Gross Profit</span>
                <span>{formatCurrency(data.grossProfit, currency, usdToPkrRate)}</span>
              </div>
            </div>

            {/* OPERATING EXPENSES */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '4px' }}>
                Operating Expenses
              </div>
              {data.operatingExpenses.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', padding: '6px 0' }}>No operating expenses recorded.</div>
              ) : (
                data.operatingExpenses.map((o: any) => (
                  <div key={o.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span>{o.code} — {o.name}</span>
                    <span>({formatCurrency(o.amount, currency, usdToPkrRate)})</span>
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.85rem', fontWeight: 700, color: '#f87171', marginTop: '4px' }}>
                <span>Total Operating Expenses</span>
                <span>({formatCurrency(data.totalOperatingExpenses, currency, usdToPkrRate)})</span>
              </div>
            </div>

            {/* NET PROFIT */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '1.05rem', fontWeight: 800, color: data.netProfit >= 0 ? '#fbbf24' : '#ef4444', border: '1px solid rgba(255,255,255,0.2)' }}>
              <span>NET PROFIT / (LOSS)</span>
              <span>{formatCurrency(data.netProfit, currency, usdToPkrRate)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
