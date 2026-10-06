'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ListOrdered,
  Plus,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  sub_type: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
};

const BLANK_FORM = { code: '', name: '', type: '' as AccountType | '', sub_type: '', description: '' };

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [slideOpen, setSlideOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  /* ── fetch ── */
  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAccounts(json.accounts);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── toast helper ── */
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── filtered & grouped accounts ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const grouped = useMemo(() => {
    const map = new Map<AccountType, Account[]>();
    for (const t of TYPE_ORDER) map.set(t, []);
    for (const a of filtered) {
      map.get(a.type)?.push(a);
    }
    return map;
  }, [filtered]);

  /* ── toggle group collapse ── */
  const toggleGroup = (type: AccountType) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  /* ── open slide-over ── */
  const openAdd = () => {
    setEditAccount(null);
    setForm({ ...BLANK_FORM });
    setErrors({});
    setSlideOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditAccount(account);
    setForm({
      code: account.code,
      name: account.name,
      type: account.type,
      sub_type: account.sub_type || '',
      description: account.description || '',
    });
    setErrors({});
    setSlideOpen(true);
  };

  const closeSlide = () => {
    setSlideOpen(false);
    setEditAccount(null);
    setForm({ ...BLANK_FORM });
    setErrors({});
  };

  /* ── form validation ── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'Account code is required.';
    if (!form.name.trim()) e.name = 'Account name is required.';
    if (!form.type) e.type = 'Account type is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── save (create or update) ── */
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        sub_type: form.sub_type.trim() || null,
        description: form.description.trim() || null,
      };
      let res: Response;
      if (editAccount) {
        res = await fetch(`/api/accounts/${editAccount.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      showToast(editAccount ? 'Account updated.' : 'Account created.', 'success');
      closeSlide();
      await load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── toggle active/inactive ── */
  const toggleActive = async (account: Account) => {
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !account.is_active }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      showToast(
        account.is_active ? 'Account deactivated.' : 'Account reactivated.',
        'success'
      );
      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, is_active: !a.is_active } : a))
      );
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="accounts-page">
      {/* ── Page Header ── */}
      <div className="accounts-page-header">
        <div className="accounts-page-title">
          <div className="accounts-page-icon">
            <ListOrdered size={22} />
          </div>
          <div>
            <h1>Chart of Accounts</h1>
            <p>{accounts.length} accounts total</p>
          </div>
        </div>
        <button className="btn-accounts-primary" onClick={openAdd}>
          <Plus size={15} />
          Add Account
        </button>
      </div>

      {/* ── Search bar ── */}
      <div className="accounts-controls-bar">
        <div className="accounts-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={13} />
            </button>
          )}
        </div>
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
          {filtered.length} accounts shown
        </span>
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="accounts-empty-state">
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
          <h3>Loading accounts…</h3>
        </div>
      ) : (
        /* ── Grouped Table ── */
        <div className="accounts-table-wrapper">
          {TYPE_ORDER.map((type) => {
            const rows = grouped.get(type) || [];
            const isCollapsed = collapsedGroups.has(type);
            return (
              <div key={type}>
                {/* Group header */}
                <div
                  className="accounts-group-header"
                  onClick={() => toggleGroup(type)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <span className={`acct-badge ${type}`}>{TYPE_LABELS[type]}</span>
                  </div>
                  <span className="accounts-group-count">{rows.length}</span>
                </div>

                {/* Rows */}
                {!isCollapsed && rows.length > 0 && (
                  <table className="accounts-table">
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>Code</th>
                        <th>Name</th>
                        <th style={{ width: 120 }}>Type</th>
                        <th style={{ width: 160 }}>Sub-type</th>
                        <th style={{ width: 80 }}>Status</th>
                        <th style={{ width: 100, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((a) => (
                        <tr key={a.id} className={!a.is_active ? 'inactive' : ''}>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#1d4ed8' }}>
                              {a.code}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{a.name}</td>
                          <td><span className={`acct-badge ${a.type}`}>{a.type}</span></td>
                          <td style={{ color: '#64748b', fontSize: '0.78rem' }}>{a.sub_type || '—'}</td>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: a.is_active ? 'rgba(21, 128, 61, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                              color: a.is_active ? '#15803d' : '#64748b',
                            }}>
                              {a.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                              <button
                                title="Edit"
                                onClick={() => openEdit(a)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)',
                                  color: '#1d4ed8', borderRadius: 6, padding: '4px 8px',
                                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                }}
                              >
                                <Pencil size={11} /> Edit
                              </button>
                              <button
                                title={a.is_active ? 'Deactivate' : 'Reactivate'}
                                onClick={() => toggleActive(a)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  background: a.is_active ? 'rgba(185,28,28,0.1)' : 'rgba(21,128,61,0.1)',
                                  border: `1px solid ${a.is_active ? 'rgba(185,28,28,0.3)' : 'rgba(21,128,61,0.3)'}`,
                                  color: a.is_active ? '#b91c1c' : '#15803d',
                                  borderRadius: 6, padding: '4px 8px',
                                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                }}
                              >
                                {a.is_active ? <ToggleLeft size={11} /> : <ToggleRight size={11} />}
                                {a.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Empty group */}
                {!isCollapsed && rows.length === 0 && (
                  <div style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', background: 'rgba(255,255,255,0.04)' }}>
                    No {TYPE_LABELS[type].toLowerCase()} accounts {search ? 'match your search' : ''}.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Slide-over panel ── */}
      {slideOpen && (
        <>
          <div className="accounts-slideover-backdrop" onClick={closeSlide} />
          <div className="accounts-slideover">
            <div className="accounts-slideover-header">
              <h2>{editAccount ? 'Edit Account' : 'New Account'}</h2>
              <button className="accounts-slideover-close" onClick={closeSlide}>
                <X size={15} />
              </button>
            </div>

            <div className="accounts-slideover-body">
              {/* Code */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">
                  Account Code <span className="required">*</span>
                </label>
                <input
                  className="accounts-form-input"
                  type="text"
                  placeholder="e.g. 1010"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
                {errors.code && <span className="accounts-form-error">{errors.code}</span>}
              </div>

              {/* Name */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">
                  Account Name <span className="required">*</span>
                </label>
                <input
                  className="accounts-form-input"
                  type="text"
                  placeholder="e.g. Cash in Hand"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                {errors.name && <span className="accounts-form-error">{errors.name}</span>}
              </div>

              {/* Type */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">
                  Account Type <span className="required">*</span>
                </label>
                <select
                  className="accounts-form-select"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType | '' }))}
                >
                  <option value="">— Select type —</option>
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                  <option value="equity">Equity</option>
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                </select>
                {errors.type && <span className="accounts-form-error">{errors.type}</span>}
              </div>

              {/* Sub-type */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">Sub-type</label>
                <input
                  className="accounts-form-input"
                  type="text"
                  placeholder="e.g. current asset, operating expense"
                  value={form.sub_type}
                  onChange={(e) => setForm((f) => ({ ...f, sub_type: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="accounts-form-field">
                <label className="accounts-form-label">Description</label>
                <textarea
                  className="accounts-form-textarea"
                  placeholder="Optional description…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="accounts-slideover-footer">
              <button className="btn-accounts-ghost" onClick={closeSlide}>
                Cancel
              </button>
              <button className="btn-accounts-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {saving ? 'Saving…' : editAccount ? 'Save Changes' : 'Create Account'}
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

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
