'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  X,
  Loader2,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Printer,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Ban,
} from 'lucide-react';
import { formatCurrency, formatDualCurrency, DEFAULT_USD_TO_PKR_RATE } from '@/lib/currency';

interface Subscriber {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Patient {
  id: string;
  patient_code: string;
  name: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  subscriber_id: string;
  patient_id?: string;
  subscription_id?: string;
  issue_date: string;
  due_date: string;
  currency: string;
  exchange_rate_usd: number;
  plan_fee_pkr: number;
  excess_medicine_pkr: number;
  lab_charges_pkr: number;
  discount_pkr: number;
  tax_pkr: number;
  total_pkr: number;
  paid_pkr: number;
  balance_pkr: number;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  notes?: string;
  subscriber?: Subscriber;
  patient?: Patient;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [usdToPkrRate, setUsdToPkrRate] = useState<number>(DEFAULT_USD_TO_PKR_RATE);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // New Invoice Wizard
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subscriber_id: '',
    patient_id: '',
    plan_fee_pkr: 0,
    excess_medicine_pkr: 0,
    lab_charges_pkr: 0,
    discount_pkr: 0,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  });

  // Quick Pay Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payNote, setPayNote] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Load Data ── */
  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, subersRes, patsRes, rateRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/subscribers'),
        fetch('/api/patients'),
        fetch('/api/exchange-rate').catch(() => null),
      ]);

      const invJson = await invRes.json();
      setInvoices(invJson.invoices || []);

      const subersJson = await subersRes.json();
      setSubscribers(subersJson.subscribers || []);

      const patsJson = await patsRes.json();
      setPatients(patsJson.patients || []);

      if (rateRes && rateRes.ok) {
        const rateJson = await rateRes.json();
        if (rateJson.usdToPkr && rateJson.usdToPkr > 0) {
          setUsdToPkrRate(rateJson.usdToPkr);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── Filters ── */
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        inv.subscriber?.name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.patient?.patient_code?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  /* ── Metrics ── */
  const metrics = useMemo(() => {
    const valid = invoices.filter((i) => i.status !== 'cancelled');
    const totalBilled = valid.reduce((sum, i) => sum + (Number(i.total_pkr) || 0), 0);
    const totalCollected = valid.reduce((sum, i) => sum + (Number(i.paid_pkr) || 0), 0);
    const totalOutstanding = valid.reduce((sum, i) => sum + (Number(i.balance_pkr) || 0), 0);
    const overdueCount = valid.filter((i) => i.status === 'overdue').length;

    return { totalBilled, totalCollected, totalOutstanding, overdueCount };
  }, [invoices]);

  /* ── Create Invoice ── */
  const handleCreateInvoice = async () => {
    if (!form.subscriber_id) {
      showToast('Please select a subscriber', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          exchange_rate_usd: usdToPkrRate,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to generate invoice');

      showToast(`Invoice ${json.invoice.invoice_number} generated successfully!`);
      setModalOpen(false);
      setForm({
        subscriber_id: '',
        patient_id: '',
        plan_fee_pkr: 0,
        excess_medicine_pkr: 0,
        lab_charges_pkr: 0,
        discount_pkr: 0,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
      });
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Quick Pay ── */
  const openPayModal = (inv: Invoice) => {
    setPayingInvoice(inv);
    setPayAmount(Number(inv.balance_pkr) || 0);
    setPayMethod('bank_transfer');
    setPayNote('');
    setPayModalOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!payingInvoice || payAmount <= 0) return;
    setPayLoading(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: payingInvoice.id,
          amount_pkr: payAmount,
          payment_method: payMethod,
          reference_note: payNote,
          exchange_rate_usd: usdToPkrRate,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to record payment');

      showToast(`Payment ${json.payment.payment_number} recorded successfully!`);
      setPayModalOpen(false);
      setPayingInvoice(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPayLoading(false);
    }
  };

  /* ── Cancel Invoice ── */
  const handleCancelInvoice = async (inv: Invoice) => {
    if (!confirm(`Are you sure you want to cancel invoice ${inv.invoice_number}?`)) return;
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to cancel invoice');

      showToast(`Invoice ${inv.invoice_number} cancelled.`);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="accounts-page">
      {/* ── Page Header ── */}
      <div className="accounts-page-header">
        <div className="accounts-page-title">
          <div className="accounts-page-icon">
            <FileText size={22} />
          </div>
          <div>
            <h1>Invoices</h1>
            <p>Monthly plan fees, excess medicines, billable labs & payment tracking</p>
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
            Generate Invoice
          </button>
        </div>
      </div>

      {/* ── Metrics ── */}
      <div className="accounts-metrics-grid">
        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">
              {formatCurrency(metrics.totalBilled, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Total Invoiced</div>
          </div>
          <div className="accounts-metric-icon">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val" style={{ color: '#4ade80' }}>
              {formatCurrency(metrics.totalCollected, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Total Collections</div>
          </div>
          <div className="accounts-metric-icon">
            <CheckCircle size={20} color="#4ade80" />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val" style={{ color: '#fbbf24' }}>
              {formatCurrency(metrics.totalOutstanding, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Outstanding AR Balance</div>
          </div>
          <div className="accounts-metric-icon">
            <Clock size={20} />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val" style={{ color: '#f87171' }}>
              {metrics.overdueCount}
            </div>
            <div className="accounts-metric-lbl">Overdue Invoices</div>
          </div>
          <div className="accounts-metric-icon">
            <AlertTriangle size={20} color="#f87171" />
          </div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="accounts-controls-bar">
        <div className="accounts-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by invoice #, subscriber, or patient…"
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="sent">Sent / Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
            {filtered.length} invoices
          </span>
        </div>
      </div>

      {/* ── Invoices Table ── */}
      {loading ? (
        <div className="accounts-empty-state">
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
          <h3>Loading invoices…</h3>
        </div>
      ) : filtered.length === 0 ? (
        <div className="accounts-empty-state">
          <FileText size={48} />
          <h3>No invoices found</h3>
          <p>Generate an invoice for subscriber health plans, excess medicines, or labs.</p>
          <button className="btn-accounts-primary" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Generate Invoice
          </button>
        </div>
      ) : (
        <div className="accounts-table-wrapper">
          <table className="accounts-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Subscriber (Payer)</th>
                <th>Patient</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance Due</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const dualTotal = formatDualCurrency(inv.total_pkr || 0, usdToPkrRate);
                const dualBalance = formatDualCurrency(inv.balance_pkr || 0, usdToPkrRate);

                let badgeClass = 'acct-badge asset';
                if (inv.status === 'paid') badgeClass = 'acct-badge revenue';
                if (inv.status === 'partially_paid') badgeClass = 'acct-badge expense';
                if (inv.status === 'overdue') badgeClass = 'acct-badge liability';
                if (inv.status === 'cancelled') badgeClass = 'acct-badge equity';

                return (
                  <tr key={inv.id} className={inv.status === 'cancelled' ? 'inactive' : ''}>
                    {/* Invoice Number */}
                    <td>
                      <button
                        onClick={() => router.push(`/accounts/invoices/${inv.id}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                        title="Click to view full invoice"
                      >
                        <strong style={{ color: '#0284c7', fontFamily: 'monospace', textDecoration: 'underline' }}>
                          {inv.invoice_number}
                        </strong>
                      </button>
                    </td>

                    {/* Subscriber */}
                    <td>
                      <strong>{inv.subscriber?.name || 'N/A'}</strong>
                      {inv.subscriber?.phone && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {inv.subscriber.phone}
                        </div>
                      )}
                    </td>

                    {/* Patient */}
                    <td>
                      <strong>{inv.patient?.name || '—'}</strong>
                      {inv.patient?.patient_code && (
                        <div style={{ fontSize: '0.7rem', color: '#0369a1' }}>
                          {inv.patient.patient_code}
                        </div>
                      )}
                    </td>

                    {/* Issue Date */}
                    <td>{inv.issue_date}</td>

                    {/* Due Date */}
                    <td>
                      <span style={{ color: inv.status === 'overdue' ? '#dc2626' : 'inherit', fontWeight: inv.status === 'overdue' ? 700 : 400 }}>
                        {inv.due_date}
                      </span>
                    </td>

                    {/* Total */}
                    <td>
                      <strong>{currency === 'PKR' ? dualTotal.pkr : dualTotal.usd}</strong>
                    </td>

                    {/* Paid */}
                    <td style={{ color: '#16a34a' }}>
                      {formatCurrency(inv.paid_pkr || 0, currency, usdToPkrRate)}
                    </td>

                    {/* Balance */}
                    <td>
                      <strong style={{ color: Number(inv.balance_pkr) > 0 ? '#b91c1c' : '#15803d' }}>
                        {currency === 'PKR' ? dualBalance.pkr : dualBalance.usd}
                      </strong>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={badgeClass}>{inv.status.replace('_', ' ')}</span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn-accounts-ghost"
                        style={{ padding: '4px 9px', fontSize: '0.72rem', marginRight: '6px' }}
                        onClick={() => router.push(`/accounts/invoices/${inv.id}`)}
                        title="View printable invoice"
                      >
                        <Printer size={12} /> View
                      </button>

                      {Number(inv.balance_pkr) > 0 && inv.status !== 'cancelled' && (
                        <button
                          className="btn-accounts-primary"
                          style={{ padding: '4px 9px', fontSize: '0.72rem', marginRight: '6px' }}
                          onClick={() => openPayModal(inv)}
                          title="Record payment"
                        >
                          <CreditCard size={12} /> Pay
                        </button>
                      )}

                      {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                        <button
                          className="btn-accounts-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#ef4444' }}
                          onClick={() => handleCancelInvoice(inv)}
                          title="Cancel invoice"
                        >
                          <Ban size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Generate Invoice Modal ── */}
      {modalOpen && (
        <>
          <div className="accounts-slideover-backdrop" onClick={() => setModalOpen(false)} />
          <div className="accounts-slideover" style={{ width: '500px' }}>
            <div className="accounts-slideover-header">
              <h2>Generate Monthly Invoice</h2>
              <button className="accounts-slideover-close" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="accounts-slideover-body">
              {/* Subscriber */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">
                  Subscriber (Account Payer) <span className="required">*</span>
                </label>
                <select
                  className="accounts-form-select"
                  value={form.subscriber_id}
                  onChange={(e) => setForm({ ...form, subscriber_id: e.target.value })}
                >
                  <option value="">Select Subscriber…</option>
                  {subscribers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.email ? `(${s.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">Patient (Beneficiary)</label>
                <select
                  className="accounts-form-select"
                  value={form.patient_id}
                  onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                >
                  <option value="">Select Patient (Optional)…</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.patient_code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Fee */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">Plan Subscription Fee (PKR)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  className="accounts-form-input"
                  value={form.plan_fee_pkr}
                  onChange={(e) => setForm({ ...form, plan_fee_pkr: Number(e.target.value) })}
                />
              </div>

              {/* Excess Medicine & Lab Charges */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="accounts-form-field">
                  <label className="accounts-form-label">Excess Medicine (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="accounts-form-input"
                    value={form.excess_medicine_pkr}
                    onChange={(e) => setForm({ ...form, excess_medicine_pkr: Number(e.target.value) })}
                  />
                </div>

                <div className="accounts-form-field">
                  <label className="accounts-form-label">Lab Test Charges (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="accounts-form-input"
                    value={form.lab_charges_pkr}
                    onChange={(e) => setForm({ ...form, lab_charges_pkr: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Discount & Due Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="accounts-form-field">
                  <label className="accounts-form-label">Discount (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="accounts-form-input"
                    value={form.discount_pkr}
                    onChange={(e) => setForm({ ...form, discount_pkr: Number(e.target.value) })}
                  />
                </div>

                <div className="accounts-form-field">
                  <label className="accounts-form-label">Due Date</label>
                  <input
                    type="date"
                    className="accounts-form-input"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Live Total preview */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '14px',
                  marginTop: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>Calculated Total:</span>
                  <strong style={{ fontSize: '1.2rem', color: '#fbbf24' }}>
                    Rs {(form.plan_fee_pkr + form.excess_medicine_pkr + form.lab_charges_pkr - form.discount_pkr).toLocaleString()}
                  </strong>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                  ≈ {formatCurrency((form.plan_fee_pkr + form.excess_medicine_pkr + form.lab_charges_pkr - form.discount_pkr), 'USD', usdToPkrRate)} at live rate
                </div>
              </div>

              {/* Notes */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">Notes for Subscriber</label>
                <textarea
                  className="accounts-form-textarea"
                  placeholder="Terms, bank payment details, or special breakdown..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="accounts-slideover-footer">
              <button className="btn-accounts-ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="btn-accounts-primary" onClick={handleCreateInvoice} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…
                  </>
                ) : (
                  'Create Invoice'
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Record Payment Modal ── */}
      {payModalOpen && payingInvoice && (
        <>
          <div className="accounts-slideover-backdrop" onClick={() => setPayModalOpen(false)} />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '460px',
              maxWidth: '92vw',
              background: '#0d2844',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '16px',
              padding: '24px',
              zIndex: 300,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24' }}>
                  Record Payment
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)' }}>
                  Invoice {payingInvoice.invoice_number}
                </span>
              </div>
              <button className="accounts-slideover-close" onClick={() => setPayModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div className="plan-meta-box">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Amount:</span>
                  <strong>Rs {payingInvoice.total_pkr?.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Already Paid:</span>
                  <span style={{ color: '#4ade80' }}>Rs {payingInvoice.paid_pkr?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                  <span>Balance Due:</span>
                  <strong style={{ color: '#f87171' }}>Rs {payingInvoice.balance_pkr?.toLocaleString()}</strong>
                </div>
              </div>

              <div className="accounts-form-field">
                <label className="accounts-form-label">
                  Payment Amount (PKR) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={payingInvoice.balance_pkr}
                  className="accounts-form-input"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                />
              </div>

              <div className="accounts-form-field">
                <label className="accounts-form-label">Payment Method</label>
                <select
                  className="accounts-form-select"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="bank_transfer">Bank Transfer (1020 Bank Account Main)</option>
                  <option value="cash">Cash (1010 Cash in Hand)</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="accounts-form-field">
                <label className="accounts-form-label">Reference Note / Transaction ID</label>
                <input
                  type="text"
                  placeholder="e.g. Bank slip #98234 or Raast ID"
                  className="accounts-form-input"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn-accounts-ghost"
                onClick={() => setPayModalOpen(false)}
                disabled={payLoading}
              >
                Cancel
              </button>
              <button
                className="btn-accounts-primary"
                onClick={handleRecordPayment}
                disabled={payLoading || payAmount <= 0}
              >
                {payLoading ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing…
                  </>
                ) : (
                  'Confirm Payment'
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
