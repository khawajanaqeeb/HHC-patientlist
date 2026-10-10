'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  X,
  Loader2,
  Calendar,
  UserCheck,
  TrendingUp,
  CreditCard,
  PauseCircle,
  PlayCircle,
  Ban,
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Plan } from '@/lib/types';
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
  legacy_patient_id?: number;
  name: string;
  subscriber_id?: string;
  subscriber_name?: string;
  address?: string;
}

interface Subscription {
  id: string;
  subscription_code: string;
  subscriber_id: string;
  patient_id: string;
  plan_id: number;
  plan_name: string;
  billing_cycle: string;
  start_date: string;
  end_date?: string;
  price_pkr: number;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  total_recognized_pkr: number;
  notes?: string;
  created_at: string;
  subscriber?: Subscriber;
  patient?: Patient;
}

const BLANK_FORM = {
  subscriber_id: '',
  patient_id: '',
  plan_id: 0,
  plan_name: '',
  billing_cycle: 'monthly',
  price_pkr: 0,
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  notes: '',
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [usdToPkrRate, setUsdToPkrRate] = useState<number>(DEFAULT_USD_TO_PKR_RATE);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [slideOpen, setSlideOpen] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [selectedSubDetail, setSelectedSubDetail] = useState<Subscription | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch Data ── */
  const loadData = async () => {
    try {
      setLoading(true);
      const [subsRes, subersRes, patsRes, plansRes, rateRes] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/subscribers'),
        fetch('/api/patients'),
        fetch('/api/plans'),
        fetch('/api/exchange-rate').catch(() => null),
      ]);

      const subsJson = await subsRes.json();
      setSubscriptions(subsJson.subscriptions || []);

      const subersJson = await subersRes.json();
      setSubscribers(subersJson.subscribers || []);

      const patsJson = await patsRes.json();
      setPatients(patsJson.patients || []);

      const plansJson = await plansRes.json();
      setPlans(plansJson.plans || []);

      if (rateRes && rateRes.ok) {
        const rateJson = await rateRes.json();
        if (rateJson.usdToPkr && rateJson.usdToPkr > 0) {
          setUsdToPkrRate(rateJson.usdToPkr);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load subscriptions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchSearch =
        s.subscription_code?.toLowerCase().includes(search.toLowerCase()) ||
        s.plan_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.subscriber?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.patient?.patient_code?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [subscriptions, search, statusFilter]);

  /* ── Key Metrics ── */
  const metrics = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active');
    const mrrPkr = active.reduce((sum, s) => sum + (Number(s.price_pkr) || 0), 0);
    const unearnedPkr = active.reduce((sum, s) => {
      const total = Number(s.price_pkr) || 0;
      const recognized = Number(s.total_recognized_pkr) || 0;
      return sum + Math.max(0, total - recognized);
    }, 0);

    return {
      totalCount: subscriptions.length,
      activeCount: active.length,
      mrrPkr,
      unearnedPkr,
    };
  }, [subscriptions]);

  /* ── Open Slideover ── */
  const openNewSubscription = () => {
    const firstPlan = plans[0];
    setForm({
      ...BLANK_FORM,
      plan_id: firstPlan ? firstPlan.id : 0,
      plan_name: firstPlan ? firstPlan.name : '',
      price_pkr: firstPlan ? firstPlan.price : 0,
      billing_cycle: firstPlan ? firstPlan.billing_cycle || 'monthly' : 'monthly',
      subscriber_id: subscribers[0]?.id || '',
      patient_id: patients[0]?.id || '',
    });
    setErrors({});
    setSlideOpen(true);
  };

  const handlePlanSelect = (planId: number) => {
    const selected = plans.find((p) => p.id === planId);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        plan_id: selected.id,
        plan_name: selected.name,
        price_pkr: selected.price || 0,
        billing_cycle: selected.billing_cycle || 'monthly',
      }));
    }
  };

  /* ── Validation & Submit ── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.subscriber_id) e.subscriber_id = 'Please select a subscriber.';
    if (!form.patient_id) e.patient_id = 'Please select a patient.';
    if (!form.plan_id) e.plan_id = 'Please select a health plan.';
    if (form.price_pkr < 0) e.price_pkr = 'Price cannot be negative.';
    if (!form.start_date) e.start_date = 'Start date is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to create subscription');

      showToast(`Subscription ${json.subscription.subscription_code} created!`);
      setSlideOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Status Actions ── */
  const handleUpdateStatus = async (
    sub: Subscription,
    newStatus: 'active' | 'paused' | 'cancelled'
  ) => {
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to update status');

      showToast(`Subscription ${sub.subscription_code} updated to ${newStatus}`);
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
            <Users size={22} />
          </div>
          <div>
            <h1>Subscriptions</h1>
            <p>Active patient plans, recurring contracts & unearned revenue tracking</p>
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

          <button className="btn-accounts-primary" onClick={openNewSubscription}>
            <Plus size={15} />
            New Subscription
          </button>
        </div>
      </div>

      {/* ── Key Metrics ── */}
      <div className="accounts-metrics-grid">
        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">{metrics.activeCount}</div>
            <div className="accounts-metric-lbl">Active Subscriptions</div>
          </div>
          <div className="accounts-metric-icon">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">
              {formatCurrency(metrics.mrrPkr, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Monthly Recurring Revenue (MRR)</div>
          </div>
          <div className="accounts-metric-icon">
            <CreditCard size={20} />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">
              {formatCurrency(metrics.unearnedPkr, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Unearned Revenue Pool</div>
          </div>
          <div className="accounts-metric-icon">
            <Clock size={20} />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">{metrics.totalCount}</div>
            <div className="accounts-metric-lbl">Total Contracts</div>
          </div>
          <div className="accounts-metric-icon">
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* ── Controls Bar ── */}
      <div className="accounts-controls-bar">
        <div className="accounts-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by code, subscriber, patient or plan…"
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
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>

          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
            {filtered.length} subscriptions
          </span>
        </div>
      </div>

      {/* ── Subscriptions Table ── */}
      {loading ? (
        <div className="accounts-empty-state">
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
          <h3>Loading subscriptions…</h3>
        </div>
      ) : filtered.length === 0 ? (
        <div className="accounts-empty-state">
          <Users size={48} />
          <h3>No subscriptions found</h3>
          <p>Create a subscription to link a subscriber and patient to a health plan.</p>
          <button className="btn-accounts-primary" onClick={openNewSubscription}>
            <Plus size={15} /> Create Subscription
          </button>
        </div>
      ) : (
        <div className="accounts-table-wrapper">
          <table className="accounts-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Subscriber (Payer)</th>
                <th>Patient (Beneficiary)</th>
                <th>Plan & Cycle</th>
                <th>Price</th>
                <th>Revenue Recognized</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => {
                const dualPrice = formatDualCurrency(sub.price_pkr || 0, usdToPkrRate);
                const recognized = Number(sub.total_recognized_pkr) || 0;
                const price = Number(sub.price_pkr) || 1;
                const percent = Math.min(100, Math.round((recognized / price) * 100));

                let badgeClass = 'acct-badge revenue';
                if (sub.status === 'paused') badgeClass = 'acct-badge expense';
                if (sub.status === 'cancelled') badgeClass = 'acct-badge liability';
                if (sub.status === 'expired') badgeClass = 'acct-badge asset';

                return (
                  <tr key={sub.id} className={sub.status === 'cancelled' ? 'inactive' : ''}>
                    {/* Code */}
                    <td>
                      <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>
                        {sub.subscription_code}
                      </strong>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {sub.start_date} {sub.end_date ? `→ ${sub.end_date}` : '(Ongoing)'}
                      </div>
                    </td>

                    {/* Subscriber */}
                    <td>
                      <strong>{sub.subscriber?.name || 'N/A'}</strong>
                      {sub.subscriber?.phone && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {sub.subscriber.phone}
                        </div>
                      )}
                    </td>

                    {/* Patient */}
                    <td>
                      <strong>{sub.patient?.name || 'N/A'}</strong>
                      <div style={{ fontSize: '0.7rem', color: '#0369a1' }}>
                        {sub.patient?.patient_code}
                      </div>
                    </td>

                    {/* Plan */}
                    <td>
                      <strong>{sub.plan_name}</strong>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'capitalize' }}>
                        {sub.billing_cycle}
                      </div>
                    </td>

                    {/* Price */}
                    <td>
                      <strong style={{ color: '#0f172a' }}>
                        {currency === 'PKR' ? dualPrice.pkr : dualPrice.usd}
                      </strong>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {currency === 'PKR' ? `≈ ${dualPrice.usd}` : `≈ ${dualPrice.pkr}`}
                      </div>
                    </td>

                    {/* Recognition Progress */}
                    <td style={{ minWidth: '150px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                        <span>Earned: {percent}%</span>
                        <span style={{ color: '#64748b' }}>{formatCurrency(recognized, currency, usdToPkrRate)}</span>
                      </div>
                      <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${percent}%`,
                            background: percent === 100 ? '#10b981' : '#3b82f6',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={badgeClass}>{sub.status}</span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn-accounts-ghost"
                        style={{ padding: '4px 8px', fontSize: '0.72rem', marginRight: '6px' }}
                        onClick={() => setSelectedSubDetail(sub)}
                        title="View details"
                      >
                        Details
                      </button>

                      {sub.status === 'active' && (
                        <button
                          className="btn-accounts-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.72rem', marginRight: '6px', color: '#f59e0b' }}
                          onClick={() => handleUpdateStatus(sub, 'paused')}
                          title="Pause subscription"
                        >
                          <PauseCircle size={13} />
                        </button>
                      )}

                      {sub.status === 'paused' && (
                        <button
                          className="btn-accounts-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.72rem', marginRight: '6px', color: '#10b981' }}
                          onClick={() => handleUpdateStatus(sub, 'active')}
                          title="Resume subscription"
                        >
                          <PlayCircle size={13} />
                        </button>
                      )}

                      {sub.status !== 'cancelled' && (
                        <button
                          className="btn-accounts-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#ef4444' }}
                          onClick={() => handleUpdateStatus(sub, 'cancelled')}
                          title="Cancel subscription"
                        >
                          <Ban size={13} />
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

      {/* ── Slide-over: New Subscription ── */}
      {slideOpen && (
        <>
          <div className="accounts-slideover-backdrop" onClick={() => setSlideOpen(false)} />
          <div className="accounts-slideover" style={{ width: '480px' }}>
            <div className="accounts-slideover-header">
              <h2>Create New Subscription</h2>
              <button className="accounts-slideover-close" onClick={() => setSlideOpen(false)}>
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
                {errors.subscriber_id && (
                  <span className="accounts-form-error">{errors.subscriber_id}</span>
                )}
              </div>

              {/* Patient */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">
                  Patient (Care Beneficiary) <span className="required">*</span>
                </label>
                <select
                  className="accounts-form-select"
                  value={form.patient_id}
                  onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                >
                  <option value="">Select Patient…</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.patient_code} — {p.name}
                    </option>
                  ))}
                </select>
                {errors.patient_id && (
                  <span className="accounts-form-error">{errors.patient_id}</span>
                )}
              </div>

              {/* Plan */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">
                  Health Plan <span className="required">*</span>
                </label>
                <select
                  className="accounts-form-select"
                  value={form.plan_id}
                  onChange={(e) => handlePlanSelect(Number(e.target.value))}
                >
                  <option value="">Select Plan…</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Rs {p.price?.toLocaleString()} ({p.billing_cycle || 'monthly'})
                    </option>
                  ))}
                </select>
                {errors.plan_id && (
                  <span className="accounts-form-error">{errors.plan_id}</span>
                )}
              </div>

              {/* Price & Billing Cycle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="accounts-form-field">
                  <label className="accounts-form-label">Price (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="accounts-form-input"
                    value={form.price_pkr}
                    onChange={(e) => setForm({ ...form, price_pkr: Number(e.target.value) })}
                  />
                  {errors.price_pkr && (
                    <span className="accounts-form-error">{errors.price_pkr}</span>
                  )}
                </div>

                <div className="accounts-form-field">
                  <label className="accounts-form-label">Billing Cycle</label>
                  <select
                    className="accounts-form-select"
                    value={form.billing_cycle}
                    onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              {/* Start & End Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="accounts-form-field">
                  <label className="accounts-form-label">
                    Start Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    className="accounts-form-input"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                  {errors.start_date && (
                    <span className="accounts-form-error">{errors.start_date}</span>
                  )}
                </div>

                <div className="accounts-form-field">
                  <label className="accounts-form-label">End Date (Optional)</label>
                  <input
                    type="date"
                    className="accounts-form-input"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">Notes & Instructions</label>
                <textarea
                  className="accounts-form-textarea"
                  placeholder="Additional terms, payer preferences, or notes…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="accounts-slideover-footer">
              <button
                className="btn-accounts-ghost"
                onClick={() => setSlideOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button className="btn-accounts-primary" onClick={handleCreate} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating…
                  </>
                ) : (
                  'Create Subscription'
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Subscription Detail Modal ── */}
      {selectedSubDetail && (
        <>
          <div className="accounts-slideover-backdrop" onClick={() => setSelectedSubDetail(null)} />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '540px',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>
                  {selectedSubDetail.subscription_code}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                  Subscription Contract Overview
                </span>
              </div>
              <button
                className="accounts-slideover-close"
                onClick={() => setSelectedSubDetail(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div className="plan-meta-box">
                <span style={{ color: '#fbbf24', fontSize: '0.7rem', textTransform: 'uppercase' }}>Subscriber (Payer)</span>
                <strong>{selectedSubDetail.subscriber?.name || 'N/A'}</strong>
                <span style={{ fontSize: '0.72rem' }}>{selectedSubDetail.subscriber?.email}</span>
                <span style={{ fontSize: '0.72rem' }}>{selectedSubDetail.subscriber?.phone}</span>
              </div>

              <div className="plan-meta-box">
                <span style={{ color: '#67e8f9', fontSize: '0.7rem', textTransform: 'uppercase' }}>Patient (Care)</span>
                <strong>{selectedSubDetail.patient?.name || 'N/A'}</strong>
                <span style={{ fontSize: '0.72rem' }}>Code: {selectedSubDetail.patient?.patient_code}</span>
                <span style={{ fontSize: '0.72rem' }}>{selectedSubDetail.patient?.address}</span>
              </div>
            </div>

            <div className="plan-meta-box" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Health Plan: <strong>{selectedSubDetail.plan_name}</strong></span>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                  {formatCurrency(selectedSubDetail.price_pkr, currency, usdToPkrRate)} / {selectedSubDetail.billing_cycle}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                <span>Term: {selectedSubDetail.start_date} to {selectedSubDetail.end_date || 'Ongoing'}</span>
                <span>Status: <strong style={{ textTransform: 'uppercase' }}>{selectedSubDetail.status}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn-accounts-ghost"
                onClick={() => setSelectedSubDetail(null)}
              >
                Close
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
