'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  Calendar,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Printer,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency, formatDualCurrency, DEFAULT_USD_TO_PKR_RATE } from '@/lib/currency';

export default function BalanceSheetPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [usdToPkrRate, setUsdToPkrRate] = useState<number>(DEFAULT_USD_TO_PKR_RATE);

  const loadData = async () => {
    try {
      setLoading(true);
      const [res, rateRes] = await Promise.all([
        fetch(`/api/reports/balance-sheet?asOfDate=${asOfDate}`),
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
  }, [asOfDate]);

  return (
    <div className="accounts-page">
      {/* ── Page Header ── */}
      <div className="accounts-page-header">
        <div className="accounts-page-title">
          <div className="accounts-page-icon">
            <Scale size={22} />
          </div>
          <div>
            <h1>Balance Sheet</h1>
            <p>Statement of financial position: Assets = Liabilities + Owner Equity</p>
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
            <Printer size={14} /> Print Balance Sheet
          </button>
        </div>
      </div>

      {/* ── Controls Bar ── */}
      <div className="accounts-controls-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>As of Date:</span>
          <input
            type="date"
            className="accounts-form-input"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
          />
        </div>

        {data && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
            {data.isBalanced ? (
              <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                <CheckCircle size={15} /> Balance Equation Satisfied (Assets = L + E)
              </span>
            ) : (
              <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                <AlertTriangle size={15} /> Out of balance equation
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {loading || !data ? (
        <div className="accounts-empty-state">
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
          <h3>Generating Balance Sheet…</h3>
        </div>
      ) : (
        <>
          {/* ── Metrics ── */}
          <div className="accounts-metrics-grid">
            <div className="accounts-metric-card">
              <div>
                <div className="accounts-metric-val" style={{ color: '#67e8f9' }}>
                  {formatCurrency(data.totalAssets, currency, usdToPkrRate)}
                </div>
                <div className="accounts-metric-lbl">Total Assets</div>
              </div>
              <div className="accounts-metric-icon">
                <Scale size={20} color="#67e8f9" />
              </div>
            </div>

            <div className="accounts-metric-card">
              <div>
                <div className="accounts-metric-val" style={{ color: '#f87171' }}>
                  {formatCurrency(data.totalLiabilities, currency, usdToPkrRate)}
                </div>
                <div className="accounts-metric-lbl">Total Liabilities</div>
              </div>
              <div className="accounts-metric-icon">
                <ShieldCheck size={20} color="#f87171" />
              </div>
            </div>

            <div className="accounts-metric-card">
              <div>
                <div className="accounts-metric-val" style={{ color: '#a78bfa' }}>
                  {formatCurrency(data.totalEquity, currency, usdToPkrRate)}
                </div>
                <div className="accounts-metric-lbl">Total Equity (With Profit)</div>
              </div>
              <div className="accounts-metric-icon">
                <Sparkles size={20} color="#a78bfa" />
              </div>
            </div>

            <div className="accounts-metric-card">
              <div>
                <div className="accounts-metric-val" style={{ color: '#4ade80' }}>
                  {formatCurrency(data.totalLiabilities + data.totalEquity, currency, usdToPkrRate)}
                </div>
                <div className="accounts-metric-lbl">Total Liabilities & Equity</div>
              </div>
              <div className="accounts-metric-icon">
                <CheckCircle size={20} color="#4ade80" />
              </div>
            </div>
          </div>

          {/* ── 2-Column Balance Sheet Table ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* LEFT: ASSETS */}
            <div className="accounts-table-wrapper" style={{ padding: '22px', background: '#0a233c' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '6px' }}>
                ASSETS
              </h2>

              {data.assets.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', padding: '8px 0' }}>No assets recorded yet.</div>
              ) : (
                data.assets.map((a: any) => (
                  <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span>{a.code} — {a.name}</span>
                    <strong style={{ color: '#ffffff' }}>{formatCurrency(a.amount, currency, usdToPkrRate)}</strong>
                  </div>
                ))
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0 0', marginTop: '16px', borderTop: '2px solid rgba(255,255,255,0.2)', fontSize: '0.95rem', fontWeight: 800, color: '#67e8f9' }}>
                <span>TOTAL ASSETS</span>
                <span>{formatCurrency(data.totalAssets, currency, usdToPkrRate)}</span>
              </div>
            </div>

            {/* RIGHT: LIABILITIES & EQUITY */}
            <div className="accounts-table-wrapper" style={{ padding: '22px', background: '#0a233c' }}>
              {/* LIABILITIES */}
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f87171', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '6px' }}>
                LIABILITIES
              </h2>

              {data.liabilities.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', padding: '8px 0' }}>No liabilities recorded.</div>
              ) : (
                data.liabilities.map((l: any) => (
                  <div key={l.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span>{l.code} — {l.name}</span>
                    <strong style={{ color: '#ffffff' }}>{formatCurrency(l.amount, currency, usdToPkrRate)}</strong>
                  </div>
                ))
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.85rem', fontWeight: 700, color: '#f87171', marginBottom: '24px' }}>
                <span>Total Liabilities</span>
                <span>{formatCurrency(data.totalLiabilities, currency, usdToPkrRate)}</span>
              </div>

              {/* EQUITY */}
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#a78bfa', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '6px' }}>
                EQUITY
              </h2>

              {data.equity.map((e: any) => (
                <div key={e.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span>{e.code} — {e.name}</span>
                  <strong style={{ color: '#ffffff' }}>{formatCurrency(e.amount, currency, usdToPkrRate)}</strong>
                </div>
              ))}

              {/* Current Period Profit line */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#fbbf24' }}>
                <span>Current Period Profit / (Loss)</span>
                <strong>{formatCurrency(data.currentPeriodProfit, currency, usdToPkrRate)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa', marginBottom: '16px' }}>
                <span>Total Equity</span>
                <span>{formatCurrency(data.totalEquity, currency, usdToPkrRate)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0 0', marginTop: '16px', borderTop: '2px solid rgba(255,255,255,0.2)', fontSize: '0.95rem', fontWeight: 800, color: '#4ade80' }}>
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span>{formatCurrency(data.totalLiabilities + data.totalEquity, currency, usdToPkrRate)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
