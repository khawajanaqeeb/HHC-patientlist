'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Play,
  Loader2,
  Calendar,
  CheckCircle,
  Clock,
  Sparkles,
  TrendingUp,
  DollarSign,
  Users,
} from 'lucide-react';
import { formatCurrency, formatDualCurrency, DEFAULT_USD_TO_PKR_RATE } from '@/lib/currency';

interface Recognition {
  id: string;
  subscription_id: string;
  period_month: string;
  recognition_date: string;
  amount_pkr: number;
  notes?: string;
  subscription?: {
    id: string;
    subscription_code: string;
    plan_name: string;
    subscriber?: { id: string; name: string };
    patient?: { id: string; patient_code: string; name: string };
  };
}

export default function RevenueRecognitionPage() {
  const [records, setRecords] = useState<Recognition[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [usdToPkrRate, setUsdToPkrRate] = useState<number>(DEFAULT_USD_TO_PKR_RATE);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Load Data ── */
  const loadData = async () => {
    try {
      setLoading(true);
      const [recRes, rateRes] = await Promise.all([
        fetch('/api/revenue-recognition'),
        fetch('/api/exchange-rate').catch(() => null),
      ]);

      const recJson = await recRes.json();
      setRecords(recJson.records || []);

      if (rateRes && rateRes.ok) {
        const rateJson = await rateRes.json();
        if (rateJson.usdToPkr && rateJson.usdToPkr > 0) {
          setUsdToPkrRate(rateJson.usdToPkr);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load revenue recognitions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── Run Recognition ── */
  const handleRunRecognition = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/revenue-recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_month: selectedMonth }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to execute recognition');

      if (json.recognized_count === 0) {
        showToast(`All active subscriptions for ${selectedMonth} have already been recognized.`);
      } else {
        showToast(
          `Successfully recognized Rs ${json.total_recognized_pkr?.toLocaleString()} across ${json.recognized_count} subscription(s)!`
        );
      }
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setRunning(false);
    }
  };

  /* ── Metrics ── */
  const metrics = useMemo(() => {
    const totalRecognized = records.reduce((sum, r) => sum + (Number(r.amount_pkr) || 0), 0);
    const thisMonthRecognized = records
      .filter((r) => r.period_month === selectedMonth)
      .reduce((sum, r) => sum + (Number(r.amount_pkr) || 0), 0);

    return { totalRecognized, thisMonthRecognized, count: records.length };
  }, [records, selectedMonth]);

  return (
    <div className="accounts-page">
      {/* ── Page Header ── */}
      <div className="accounts-page-header">
        <div className="accounts-page-title">
          <div className="accounts-page-icon">
            <RefreshCw size={22} />
          </div>
          <div>
            <h1>Revenue Recognition</h1>
            <p>Earn unearned subscription liability into recognised revenue per accounting period</p>
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

      {/* ── Metrics ── */}
      <div className="accounts-metrics-grid">
        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val" style={{ color: '#4ade80' }}>
              {formatCurrency(metrics.totalRecognized, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Cumulative Recognized Revenue</div>
          </div>
          <div className="accounts-metric-icon">
            <DollarSign size={20} color="#4ade80" />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val" style={{ color: '#fbbf24' }}>
              {formatCurrency(metrics.thisMonthRecognized, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Period ({selectedMonth}) Recognized</div>
          </div>
          <div className="accounts-metric-icon">
            <Sparkles size={20} />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">{metrics.count}</div>
            <div className="accounts-metric-lbl">Recognition Postings</div>
          </div>
          <div className="accounts-metric-icon">
            <CheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* ── Trigger Bar ── */}
      <div className="accounts-controls-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffffff' }}>
            Accounting Period:
          </span>
          <input
            type="month"
            className="accounts-form-input"
            style={{ width: 'auto', padding: '7px 14px', fontSize: '0.82rem' }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />

          <button
            className="btn-accounts-primary"
            onClick={handleRunRecognition}
            disabled={running}
            style={{ padding: '8px 16px' }}
          >
            {running ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing…
              </>
            ) : (
              <>
                <Play size={14} fill="#ffffff" /> Run Recognition for {selectedMonth}
              </>
            )}
          </button>
        </div>

        <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)' }}>
          Debits 2050 Unearned Revenue & Credits Plan Revenue Account
        </span>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="accounts-empty-state">
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
          <h3>Loading recognition log…</h3>
        </div>
      ) : records.length === 0 ? (
        <div className="accounts-empty-state">
          <RefreshCw size={48} />
          <h3>No recognition history yet</h3>
          <p>Click "Run Recognition" to recognize revenue from active subscriptions for this month.</p>
        </div>
      ) : (
        <div className="accounts-table-wrapper">
          <table className="accounts-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Run Date</th>
                <th>Subscription Code</th>
                <th>Subscriber (Payer)</th>
                <th>Patient</th>
                <th>Plan Name</th>
                <th>Recognized Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const dual = formatDualCurrency(r.amount_pkr || 0, usdToPkrRate);

                return (
                  <tr key={r.id}>
                    <td>
                      <strong style={{ color: '#0284c7' }}>{r.period_month}</strong>
                    </td>
                    <td>{r.recognition_date}</td>
                    <td>
                      <strong style={{ fontFamily: 'monospace', color: '#0f766e' }}>
                        {r.subscription?.subscription_code || '—'}
                      </strong>
                    </td>
                    <td>
                      <strong>{r.subscription?.subscriber?.name || '—'}</strong>
                    </td>
                    <td>
                      <span>{r.subscription?.patient?.name || '—'}</span>
                    </td>
                    <td>{r.subscription?.plan_name || '—'}</td>
                    <td>
                      <strong style={{ color: '#16a34a' }}>
                        {currency === 'PKR' ? dual.pkr : dual.usd}
                      </strong>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {r.notes || 'Automated monthly recognition run'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`accounts-toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
