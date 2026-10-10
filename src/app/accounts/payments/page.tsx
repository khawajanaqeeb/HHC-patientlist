'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  X,
  Loader2,
  DollarSign,
  Building,
  TrendingUp,
  FileText,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { formatCurrency, formatDualCurrency, DEFAULT_USD_TO_PKR_RATE } from '@/lib/currency';

interface Subscriber {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_pkr: number;
  balance_pkr: number;
}

interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  subscriber_id: string;
  payment_date: string;
  amount_pkr: number;
  exchange_rate_usd: number;
  payment_method: string;
  reference_note?: string;
  created_at: string;
  subscriber?: Subscriber;
  invoice?: Invoice;
  destination_account?: { id: string; code: string; name: string };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [usdToPkrRate, setUsdToPkrRate] = useState<number>(DEFAULT_USD_TO_PKR_RATE);

  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    invoice_id: '',
    amount_pkr: 0,
    payment_method: 'bank_transfer',
    payment_date: new Date().toISOString().split('T')[0],
    reference_note: '',
  });

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch Payments & Invoices ── */
  const loadData = async () => {
    try {
      setLoading(true);
      const [payRes, invRes, rateRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/invoices'),
        fetch('/api/exchange-rate').catch(() => null),
      ]);

      const payJson = await payRes.json();
      setPayments(payJson.payments || []);

      const invJson = await invRes.json();
      setInvoices((invJson.invoices || []).filter((i: any) => Number(i.balance_pkr) > 0));

      if (rateRes && rateRes.ok) {
        const rateJson = await rateRes.json();
        if (rateJson.usdToPkr && rateJson.usdToPkr > 0) {
          setUsdToPkrRate(rateJson.usdToPkr);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── Filter ── */
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        p.payment_number?.toLowerCase().includes(search.toLowerCase()) ||
        p.subscriber?.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.invoice?.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        p.reference_note?.toLowerCase().includes(search.toLowerCase());
      const matchMethod = methodFilter === 'all' || p.payment_method === methodFilter;
      return matchSearch && matchMethod;
    });
  }, [payments, search, methodFilter]);

  /* ── Metrics ── */
  const metrics = useMemo(() => {
    const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount_pkr) || 0), 0);
    const bankTotal = payments
      .filter((p) => p.payment_method === 'bank_transfer' || p.payment_method === 'online')
      .reduce((sum, p) => sum + (Number(p.amount_pkr) || 0), 0);
    const cashTotal = payments
      .filter((p) => p.payment_method === 'cash')
      .reduce((sum, p) => sum + (Number(p.amount_pkr) || 0), 0);

    return { totalCollected, count: payments.length, bankTotal, cashTotal };
  }, [payments]);

  /* ── Submit Payment ── */
  const handleRecordPayment = async () => {
    if (!form.invoice_id || form.amount_pkr <= 0) {
      showToast('Please select an invoice and enter a valid amount', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          exchange_rate_usd: usdToPkrRate,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to record payment');

      showToast(`Payment ${json.payment.payment_number} recorded successfully!`);
      setModalOpen(false);
      setForm({
        invoice_id: '',
        amount_pkr: 0,
        payment_method: 'bank_transfer',
        payment_date: new Date().toISOString().split('T')[0],
        reference_note: '',
      });
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="accounts-page">
      {/* ── Page Header ── */}
      <div className="accounts-page-header">
        <div className="accounts-page-title">
          <div className="accounts-page-icon">
            <CreditCard size={22} />
          </div>
          <div>
            <h1>Payments Received</h1>
            <p>Cash and bank collections, AR relief & double-entry receipts</p>
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

          <button className="btn-accounts-primary" onClick={() => setModalOpen(true)}>
            <Plus size={15} />
            Record Payment
          </button>
        </div>
      </div>

      {/* ── Metrics ── */}
      <div className="accounts-metrics-grid">
        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val" style={{ color: '#4ade80' }}>
              {formatCurrency(metrics.totalCollected, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Total Cash & Bank Receipts</div>
          </div>
          <div className="accounts-metric-icon">
            <DollarSign size={20} color="#4ade80" />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">{metrics.count}</div>
            <div className="accounts-metric-lbl">Payment Transactions</div>
          </div>
          <div className="accounts-metric-icon">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">
              {formatCurrency(metrics.bankTotal, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Bank Collections (1020)</div>
          </div>
          <div className="accounts-metric-icon">
            <Building size={20} />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">
              {formatCurrency(metrics.cashTotal, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Cash in Hand (1010)</div>
          </div>
          <div className="accounts-metric-icon">
            <CreditCard size={20} />
          </div>
        </div>
      </div>

      {/* ── Controls Bar ── */}
      <div className="accounts-controls-bar">
        <div className="accounts-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search payments by #, subscriber, invoice or ref note…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="accounts-form-select"
            style={{ width: 'auto', padding: '7px 12px', fontSize: '0.78rem' }}
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">All Methods</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="cheque">Cheque</option>
          </select>

          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
            {filtered.length} payments
          </span>
        </div>
      </div>

      {/* ── Payments Table ── */}
      {loading ? (
        <div className="accounts-empty-state">
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
          <h3>Loading payments…</h3>
        </div>
      ) : filtered.length === 0 ? (
        <div className="accounts-empty-state">
          <CreditCard size={48} />
          <h3>No payments found</h3>
          <p>Record subscriber payments against open invoices.</p>
          <button className="btn-accounts-primary" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Record Payment
          </button>
        </div>
      ) : (
        <div className="accounts-table-wrapper">
          <table className="accounts-table">
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Date</th>
                <th>Subscriber (Payer)</th>
                <th>Invoice #</th>
                <th>Amount Received</th>
                <th>Method</th>
                <th>Destination Account</th>
                <th>Reference Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const dual = formatDualCurrency(p.amount_pkr || 0, usdToPkrRate);

                return (
                  <tr key={p.id}>
                    {/* Payment # */}
                    <td>
                      <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>
                        {p.payment_number}
                      </strong>
                    </td>

                    {/* Date */}
                    <td>{p.payment_date}</td>

                    {/* Subscriber */}
                    <td>
                      <strong>{p.subscriber?.name || 'N/A'}</strong>
                    </td>

                    {/* Invoice */}
                    <td>
                      <span style={{ fontFamily: 'monospace', color: '#0f766e', fontWeight: 600 }}>
                        {p.invoice?.invoice_number || '—'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td>
                      <strong style={{ color: '#16a34a' }}>
                        {currency === 'PKR' ? dual.pkr : dual.usd}
                      </strong>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {currency === 'PKR' ? `≈ ${dual.usd}` : `≈ ${dual.pkr}`}
                      </div>
                    </td>

                    {/* Method */}
                    <td>
                      <span className="acct-badge asset" style={{ textTransform: 'capitalize' }}>
                        {p.payment_method.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Destination Account */}
                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: 600 }}>
                        {p.destination_account
                          ? `${p.destination_account.code} — ${p.destination_account.name}`
                          : p.payment_method === 'cash'
                          ? '1010 — Cash in Hand'
                          : '1020 — Bank Account Main'}
                      </span>
                    </td>

                    {/* Reference Note */}
                    <td style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {p.reference_note || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      {modalOpen && (
        <>
          <div className="accounts-slideover-backdrop" onClick={() => setModalOpen(false)} />
          <div className="accounts-slideover" style={{ width: '480px' }}>
            <div className="accounts-slideover-header">
              <h2>Record Payment</h2>
              <button className="accounts-slideover-close" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="accounts-slideover-body">
              {/* Invoice */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">
                  Select Open Invoice <span className="required">*</span>
                </label>
                <select
                  className="accounts-form-select"
                  value={form.invoice_id}
                  onChange={(e) => {
                    const invId = e.target.value;
                    const selected = invoices.find((i) => i.id === invId);
                    setForm({
                      ...form,
                      invoice_id: invId,
                      amount_pkr: selected ? Number(selected.balance_pkr) : 0,
                    });
                  }}
                >
                  <option value="">Select Invoice…</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {inv.subscriber?.name} (Balance: Rs {inv.balance_pkr?.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">
                  Payment Amount (PKR) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="500"
                  className="accounts-form-input"
                  value={form.amount_pkr}
                  onChange={(e) => setForm({ ...form, amount_pkr: Number(e.target.value) })}
                />
              </div>

              {/* Method & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="accounts-form-field">
                  <label className="accounts-form-label">Payment Method</label>
                  <select
                    className="accounts-form-select"
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  >
                    <option value="bank_transfer">Bank Transfer (1020)</option>
                    <option value="cash">Cash in Hand (1010)</option>
                    <option value="online">Online Collection</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="accounts-form-field">
                  <label className="accounts-form-label">Payment Date</label>
                  <input
                    type="date"
                    className="accounts-form-input"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Reference Note */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">Reference Note / Bank Slip ID</label>
                <input
                  type="text"
                  placeholder="e.g. Deposit Slip #1234 or Raast Ref"
                  className="accounts-form-input"
                  value={form.reference_note}
                  onChange={(e) => setForm({ ...form, reference_note: e.target.value })}
                />
              </div>
            </div>

            <div className="accounts-slideover-footer">
              <button className="btn-accounts-ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="btn-accounts-primary" onClick={handleRecordPayment} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing…
                  </>
                ) : (
                  'Record Payment'
                )}
              </button>
            </div>
          </div>
        </>
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
