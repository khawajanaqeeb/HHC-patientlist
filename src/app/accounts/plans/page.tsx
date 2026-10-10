'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookMarked,
  Plus,
  Search,
  X,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Stethoscope,
  HeartHandshake,
  Activity,
  Brain,
  Pill,
  ShieldCheck,
  Building2,
  FlaskConical,
  Coins,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Plan } from '@/lib/types';
import { formatCurrency, formatDualCurrency, DEFAULT_USD_TO_PKR_RATE } from '@/lib/currency';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

const BLANK_PLAN_FORM = {
  id: 0,
  name: '',
  price: 0,
  billing_cycle: 'monthly',
  revenue_account_id: '',
  doc: 0,
  nurPhy: 0,
  nur: 0,
  phy: 0,
  psy: 0,
  med: 0,
  sv: 0,
  flu: 0,
  opd: 0,
  lab_tests: 0,
  is_active: true,
};

export default function AccountsPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [usdToPkrRate, setUsdToPkrRate] = useState<number>(DEFAULT_USD_TO_PKR_RATE);
  const [search, setSearch] = useState('');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [slideOpen, setSlideOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState({ ...BLANK_PLAN_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Load Plans, Accounts & Exchange Rate ── */
  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, accountsRes, rateRes] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/accounts'),
        fetch('/api/exchange-rate').catch(() => null),
      ]);

      const plansJson = await plansRes.json();
      if (plansJson.error) throw new Error(plansJson.error);
      setPlans(plansJson.plans || []);

      const accountsJson = await accountsRes.json();
      if (accountsJson.accounts) {
        setAccounts(accountsJson.accounts);
      }

      if (rateRes && rateRes.ok) {
        const rateJson = await rateRes.json();
        if (rateJson.usdToPkr && rateJson.usdToPkr > 0) {
          setUsdToPkrRate(rateJson.usdToPkr);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── Revenue accounts map ── */
  const revenueAccounts = useMemo(() => {
    return accounts.filter((a) => a.type === 'revenue');
  }, [accounts]);

  const revenueAccountMap = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  /* ── Filtered plans ── */
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        String(p.price).includes(search);
      const matchCycle =
        cycleFilter === 'all' || (p.billing_cycle || 'monthly') === cycleFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.is_active !== false) ||
        (statusFilter === 'inactive' && p.is_active === false);
      return matchSearch && matchCycle && matchStatus;
    });
  }, [plans, search, cycleFilter, statusFilter]);

  /* ── Computed Metrics ── */
  const metrics = useMemo(() => {
    const active = plans.filter((p) => p.is_active !== false);
    const avgPrice =
      active.length > 0
        ? active.reduce((sum, p) => sum + (p.price || 0), 0) / active.length
        : 0;
    const maxMed = active.reduce((max, p) => Math.max(max, p.med || 0), 0);
    const linkedRevenueCount = active.filter((p) => p.revenue_account_id).length;

    return {
      total: plans.length,
      activeCount: active.length,
      avgPrice,
      maxMed,
      linkedRevenueCount,
    };
  }, [plans]);

  /* ── Slideover open/close ── */
  const openAdd = () => {
    const nextId =
      plans.length > 0 ? Math.max(...plans.map((p) => p.id)) + 1 : 1;
    setEditPlan(null);
    setForm({
      ...BLANK_PLAN_FORM,
      id: nextId,
      revenue_account_id: revenueAccounts[0]?.id || '',
    });
    setErrors({});
    setSlideOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditPlan(plan);
    setForm({
      id: plan.id,
      name: plan.name,
      price: plan.price || 0,
      billing_cycle: plan.billing_cycle || 'monthly',
      revenue_account_id: plan.revenue_account_id || '',
      doc: plan.doc || 0,
      nurPhy: plan.nurPhy || 0,
      nur: plan.nur || 0,
      phy: plan.phy || 0,
      psy: plan.psy || 0,
      med: plan.med || 0,
      sv: plan.sv || 0,
      flu: plan.flu || 0,
      opd: plan.opd || 0,
      lab_tests: plan.lab_tests || 0,
      is_active: plan.is_active !== false,
    });
    setErrors({});
    setSlideOpen(true);
  };

  const closeSlide = () => {
    setSlideOpen(false);
    setEditPlan(null);
    setForm({ ...BLANK_PLAN_FORM });
    setErrors({});
  };

  /* ── Validation & Save ── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Plan name is required.';
    if (form.price < 0) e.price = 'Price cannot be negative.';
    if (form.med < 0) e.med = 'Medicine limit cannot be negative.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let updatedList: Plan[] = [];
      const updatedPlan: Plan = {
        id: form.id,
        name: form.name.trim(),
        price: Number(form.price) || 0,
        billing_cycle: form.billing_cycle,
        revenue_account_id: form.revenue_account_id || null,
        doc: Number(form.doc) || 0,
        nurPhy: Number(form.nurPhy) || 0,
        nur: Number(form.nur) || 0,
        phy: Number(form.phy) || 0,
        psy: Number(form.psy) || 0,
        med: Number(form.med) || 0,
        sv: Number(form.sv) || 0,
        flu: Number(form.flu) || 0,
        opd: Number(form.opd) || 0,
        lab_tests: Number(form.lab_tests) || 0,
        is_active: form.is_active,
      };

      if (editPlan) {
        updatedList = plans.map((p) => (p.id === editPlan.id ? updatedPlan : p));
      } else {
        updatedList = [...plans, updatedPlan];
      }

      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: updatedList }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to save plan');

      setPlans(json.plans || updatedList);
      showToast(editPlan ? 'Plan updated successfully' : 'New plan created successfully');
      closeSlide();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      const updatedList = plans.map((p) =>
        p.id === plan.id ? { ...p, is_active: p.is_active === false } : p
      );
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: updatedList }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to update plan status');
      setPlans(json.plans || updatedList);
      showToast(`Plan ${plan.name} status updated`);
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
            <BookMarked size={22} />
          </div>
          <div>
            <h1>Health Plans</h1>
            <p>Clinical visit inclusions, medicine coverage & revenue assignment</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Live Currency Toggle */}
          <div className="currency-toggle-wrapper">
            <button
              className={`currency-toggle-btn ${currency === 'PKR' ? 'active' : ''}`}
              onClick={() => setCurrency('PKR')}
              title="Show amounts in Pakistani Rupee (PKR)"
            >
              PKR (Rs)
            </button>
            <button
              className={`currency-toggle-btn ${currency === 'USD' ? 'active' : ''}`}
              onClick={() => setCurrency('USD')}
              title="Convert amounts to US Dollars (USD)"
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
            title="Real-time live exchange rate from open exchange service"
          >
            <TrendingUp size={12} color="#fbbf24" />
            1 USD = {usdToPkrRate.toFixed(2)} PKR
          </span>

          <button className="btn-accounts-primary" onClick={openAdd}>
            <Plus size={15} />
            Add New Plan
          </button>
        </div>
      </div>

      {/* ── Key Metrics ── */}
      <div className="accounts-metrics-grid">
        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">{metrics.activeCount}</div>
            <div className="accounts-metric-lbl">Active Health Plans</div>
          </div>
          <div className="accounts-metric-icon">
            <Layers size={20} />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">
              {formatCurrency(metrics.avgPrice, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Average Plan Price</div>
          </div>
          <div className="accounts-metric-icon">
            <Coins size={20} />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">
              {formatCurrency(metrics.maxMed, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Max Medicine Limit</div>
          </div>
          <div className="accounts-metric-icon">
            <Pill size={20} />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">
              {metrics.linkedRevenueCount} / {metrics.activeCount}
            </div>
            <div className="accounts-metric-lbl">Revenue Accounts Linked</div>
          </div>
          <div className="accounts-metric-icon">
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="accounts-controls-bar">
        <div className="accounts-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search plans by name or price…"
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
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
          >
            <option value="all">All Billing Cycles</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>

          <select
            className="accounts-form-select"
            style={{ width: 'auto', padding: '7px 12px', fontSize: '0.78rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <span
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.5)',
              whiteSpace: 'nowrap',
            }}
          >
            {filteredPlans.length} plans
          </span>
        </div>
      </div>

      {/* ── Content: Loading or Grid ── */}
      {loading ? (
        <div className="accounts-empty-state">
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
          <h3>Loading health plans…</h3>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="accounts-empty-state">
          <BookMarked size={48} />
          <h3>No plans found</h3>
          <p>Try adjusting your search criteria or create a new plan.</p>
          <button className="btn-accounts-primary" onClick={openAdd}>
            <Plus size={15} /> Add Plan
          </button>
        </div>
      ) : (
        <div className="plans-grid">
          {filteredPlans.map((plan) => {
            const dual = formatDualCurrency(plan.price || 0, usdToPkrRate);
            const medDual = formatDualCurrency(plan.med || 0, usdToPkrRate);
            const revAcct = plan.revenue_account_id
              ? revenueAccountMap.get(plan.revenue_account_id)
              : null;
            const isActive = plan.is_active !== false;

            return (
              <div
                key={plan.id}
                className={`plan-card ${!isActive ? 'inactive' : ''}`}
              >
                <div>
                  {/* Card Header */}
                  <div className="plan-card-header">
                    <div>
                      <div className="plan-card-title">{plan.name}</div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          color: '#fbbf24',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {plan.billing_cycle || 'monthly'} cycle
                      </span>
                    </div>

                    <span
                      className={`acct-badge ${isActive ? 'revenue' : 'liability'}`}
                      style={{ fontSize: '0.68rem' }}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Price Box */}
                  <div className="plan-card-price-box">
                    <div className="plan-card-price">
                      {currency === 'PKR' ? dual.pkr : dual.usd}
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: 'rgba(255,255,255,0.6)',
                          marginLeft: '4px',
                        }}
                      >
                        / {plan.billing_cycle || 'mo'}
                      </span>
                    </div>
                    <div className="plan-card-price-sub">
                      {currency === 'PKR' ? `≈ ${dual.usd}` : `≈ ${dual.pkr}`}
                    </div>
                  </div>

                  {/* Linked Revenue Account */}
                  <div className="plan-meta-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={13} color="#fbbf24" />
                      <span>Revenue Account:</span>
                    </div>
                    <strong style={{ color: '#ffffff' }}>
                      {revAcct
                        ? `${revAcct.code} — ${revAcct.name}`
                        : 'Default (4010 Subscription Revenue)'}
                    </strong>
                  </div>

                  {/* Clinical Inclusions Grid */}
                  <div className="plan-inclusions-list">
                    <div className="plan-inclusion-item">
                      <span className="plan-inclusion-label">
                        <Stethoscope size={13} color="#4ade80" /> Doctor:
                      </span>
                      <span className="plan-inclusion-value">{plan.doc || 0}</span>
                    </div>

                    <div className="plan-inclusion-item">
                      <span className="plan-inclusion-label">
                        <HeartHandshake size={13} color="#38bdf8" /> Nur+Phy:
                      </span>
                      <span className="plan-inclusion-value">{plan.nurPhy || 0}</span>
                    </div>

                    <div className="plan-inclusion-item">
                      <span className="plan-inclusion-label">
                        <Activity size={13} color="#60a5fa" /> Nurse:
                      </span>
                      <span className="plan-inclusion-value">{plan.nur || 0}</span>
                    </div>

                    <div className="plan-inclusion-item">
                      <span className="plan-inclusion-label">
                        <Activity size={13} color="#a78bfa" /> Physio:
                      </span>
                      <span className="plan-inclusion-value">{plan.phy || 0}</span>
                    </div>

                    <div className="plan-inclusion-item">
                      <span className="plan-inclusion-label">
                        <Brain size={13} color="#f472b6" /> Psych:
                      </span>
                      <span className="plan-inclusion-value">{plan.psy || 0}</span>
                    </div>

                    <div className="plan-inclusion-item">
                      <span className="plan-inclusion-label">
                        <Activity size={13} color="#facc15" /> SV visits:
                      </span>
                      <span className="plan-inclusion-value">{plan.sv || 0}</span>
                    </div>

                    <div className="plan-inclusion-item">
                      <span className="plan-inclusion-label">
                        <ShieldCheck size={13} color="#34d399" /> Flu Vac:
                      </span>
                      <span className="plan-inclusion-value">{plan.flu || 0}</span>
                    </div>

                    <div className="plan-inclusion-item">
                      <span className="plan-inclusion-label">
                        <Building2 size={13} color="#fb923c" /> OPD:
                      </span>
                      <span className="plan-inclusion-value">{plan.opd || 0}</span>
                    </div>

                    <div className="plan-inclusion-item" style={{ gridColumn: 'span 2' }}>
                      <span className="plan-inclusion-label">
                        <FlaskConical size={13} color="#c084fc" /> Lab Tests Allowance:
                      </span>
                      <span className="plan-inclusion-value">
                        {plan.lab_tests ? `${plan.lab_tests} tests` : 'None / Billed'}
                      </span>
                    </div>

                    <div className="plan-inclusion-item" style={{ gridColumn: 'span 2' }}>
                      <span className="plan-inclusion-label">
                        <Pill size={13} color="#f87171" /> Medicine Limit:
                      </span>
                      <span className="plan-inclusion-value" style={{ color: '#fca5a5' }}>
                        {currency === 'PKR' ? medDual.pkr : medDual.usd}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="plan-card-actions">
                  <button
                    className="btn-accounts-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.74rem' }}
                    onClick={() => handleToggleActive(plan)}
                    title={isActive ? 'Deactivate this plan' : 'Activate this plan'}
                  >
                    {isActive ? (
                      <>
                        <ToggleRight size={14} color="#4ade80" /> Deactivate
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={14} color="#f87171" /> Activate
                      </>
                    )}
                  </button>

                  <button
                    className="btn-accounts-primary"
                    style={{ padding: '6px 14px', fontSize: '0.74rem' }}
                    onClick={() => openEdit(plan)}
                  >
                    <Pencil size={13} /> Edit Plan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Slide-over Panel for Create / Edit ── */}
      {slideOpen && (
        <>
          <div className="accounts-slideover-backdrop" onClick={closeSlide} />
          <div className="accounts-slideover" style={{ width: '480px' }}>
            <div className="accounts-slideover-header">
              <h2>{editPlan ? `Edit Plan #${form.id}` : 'Create Health Plan'}</h2>
              <button className="accounts-slideover-close" onClick={closeSlide}>
                <X size={16} />
              </button>
            </div>

            <div className="accounts-slideover-body">
              {/* Plan Name */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">
                  Plan Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="accounts-form-input"
                  placeholder="e.g. Standard Care Plan"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {errors.name && <span className="accounts-form-error">{errors.name}</span>}
              </div>

              {/* Price & Billing Cycle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="accounts-form-field">
                  <label className="accounts-form-label">
                    Price (PKR) <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="accounts-form-input"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  />
                  {errors.price && <span className="accounts-form-error">{errors.price}</span>}
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

              {/* Linked Revenue Account */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">Linked Revenue Account</label>
                <select
                  className="accounts-form-select"
                  value={form.revenue_account_id}
                  onChange={(e) => setForm({ ...form, revenue_account_id: e.target.value })}
                >
                  <option value="">Default (4010 Subscription Revenue Basic)</option>
                  {revenueAccounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>
                      {acct.code} — {acct.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Medicine Limit (PKR) */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">Medicine Limit (PKR)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  className="accounts-form-input"
                  value={form.med}
                  onChange={(e) => setForm({ ...form, med: Number(e.target.value) })}
                />
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                  Actual medicine dispensed exceeding this number is billed on the monthly invoice.
                </span>
                {errors.med && <span className="accounts-form-error">{errors.med}</span>}
              </div>

              {/* Lab Tests Allowance */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">Included Lab Tests</label>
                <input
                  type="number"
                  min="0"
                  className="accounts-form-input"
                  value={form.lab_tests}
                  onChange={(e) => setForm({ ...form, lab_tests: Number(e.target.value) })}
                />
              </div>

              {/* Clinical Visit Allowances Grid */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">Clinical Visits Inclusions</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Doctor</span>
                    <input
                      type="number"
                      min="0"
                      className="accounts-form-input"
                      value={form.doc}
                      onChange={(e) => setForm({ ...form, doc: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Nurse + Physio</span>
                    <input
                      type="number"
                      min="0"
                      className="accounts-form-input"
                      value={form.nurPhy}
                      onChange={(e) => setForm({ ...form, nurPhy: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Nurse Only</span>
                    <input
                      type="number"
                      min="0"
                      className="accounts-form-input"
                      value={form.nur}
                      onChange={(e) => setForm({ ...form, nur: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Physio Only</span>
                    <input
                      type="number"
                      min="0"
                      className="accounts-form-input"
                      value={form.phy}
                      onChange={(e) => setForm({ ...form, phy: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Psychiatrist</span>
                    <input
                      type="number"
                      min="0"
                      className="accounts-form-input"
                      value={form.psy}
                      onChange={(e) => setForm({ ...form, psy: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Symptom Visits (SV)</span>
                    <input
                      type="number"
                      min="0"
                      className="accounts-form-input"
                      value={form.sv}
                      onChange={(e) => setForm({ ...form, sv: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Flu Vaccine (FV)</span>
                    <input
                      type="number"
                      min="0"
                      className="accounts-form-input"
                      value={form.flu}
                      onChange={(e) => setForm({ ...form, flu: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>OPD Visits</span>
                    <input
                      type="number"
                      min="0"
                      className="accounts-form-input"
                      value={form.opd}
                      onChange={(e) => setForm({ ...form, opd: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Active Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>Active Status</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                    Only active plans are selectable for new subscriptions.
                  </div>
                </div>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                >
                  {form.is_active ? (
                    <ToggleRight size={28} color="#4ade80" />
                  ) : (
                    <ToggleLeft size={28} color="#f87171" />
                  )}
                </button>
              </div>
            </div>

            <div className="accounts-slideover-footer">
              <button className="btn-accounts-ghost" onClick={closeSlide} disabled={saving}>
                Cancel
              </button>
              <button className="btn-accounts-primary" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…
                  </>
                ) : (
                  'Save Plan'
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div className={`accounts-toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
