'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Scale,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { formatCurrency, formatDualCurrency, DEFAULT_USD_TO_PKR_RATE } from '@/lib/currency';

interface JournalLine {
  id: string;
  account_code: string;
  account_name: string;
  debit_pkr: number;
  credit_pkr: number;
  description?: string;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  source_type: 'invoice' | 'payment' | 'revenue_recognition' | 'manual' | 'expense' | 'reversal';
  description: string;
  is_void: boolean;
  lines: JournalLine[];
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [usdToPkrRate, setUsdToPkrRate] = useState<number>(DEFAULT_USD_TO_PKR_RATE);

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Manual entry modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<Array<{ account_code: string; debit_pkr: number; credit_pkr: number; description: string }>>([
    { account_code: '1020', debit_pkr: 0, credit_pkr: 0, description: '' },
    { account_code: '4010', debit_pkr: 0, credit_pkr: 0, description: '' },
  ]);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Load Data ── */
  const loadData = async () => {
    try {
      setLoading(true);
      const [jnlRes, acctRes, rateRes] = await Promise.all([
        fetch('/api/journal'),
        fetch('/api/accounts'),
        fetch('/api/exchange-rate').catch(() => null),
      ]);

      const jnlJson = await jnlRes.json();
      setEntries(jnlJson.entries || []);

      const acctJson = await acctRes.json();
      setAccounts(acctJson.accounts || []);

      if (rateRes && rateRes.ok) {
        const rateJson = await rateRes.json();
        if (rateJson.usdToPkr && rateJson.usdToPkr > 0) {
          setUsdToPkrRate(rateJson.usdToPkr);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load journal entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── Toggle Expand ── */
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Filter ── */
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchSearch =
        e.entry_number?.toLowerCase().includes(search.toLowerCase()) ||
        e.description?.toLowerCase().includes(search.toLowerCase()) ||
        e.lines?.some((l) =>
          l.account_code?.toLowerCase().includes(search.toLowerCase()) ||
          l.account_name?.toLowerCase().includes(search.toLowerCase())
        );
      const matchSource = sourceFilter === 'all' || e.source_type === sourceFilter;
      return matchSearch && matchSource;
    });
  }, [entries, search, sourceFilter]);

  /* ── Metrics ── */
  const metrics = useMemo(() => {
    let totalDebits = 0;
    let totalCredits = 0;

    entries.forEach((e) => {
      (e.lines || []).forEach((l) => {
        totalDebits += Number(l.debit_pkr) || 0;
        totalCredits += Number(l.credit_pkr) || 0;
      });
    });

    return { totalDebits, totalCredits, count: entries.length };
  }, [entries]);

  /* ── Modal Lines Handlers ── */
  const addLine = () => {
    setLines([...lines, { account_code: accounts[0]?.code || '1010', debit_pkr: 0, credit_pkr: 0, description: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      showToast('A double-entry journal requires at least two lines', 'error');
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalFormDebit = lines.reduce((sum, l) => sum + (Number(l.debit_pkr) || 0), 0);
  const totalFormCredit = lines.reduce((sum, l) => sum + (Number(l.credit_pkr) || 0), 0);
  const formDifference = Math.abs(totalFormDebit - totalFormCredit);

  const handleCreateEntry = async () => {
    if (!description.trim()) {
      showToast('Description is required', 'error');
      return;
    }
    if (formDifference > 0.05) {
      showToast(`Out of balance: Debits (Rs ${totalFormDebit}) != Credits (Rs ${totalFormCredit})`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: entryDate,
          description: description.trim(),
          lines,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to save entry');

      showToast(`Journal entry ${json.entry.entry_number} posted successfully!`);
      setModalOpen(false);
      setDescription('');
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
            <BookOpen size={22} />
          </div>
          <div>
            <h1>Journal Entries</h1>
            <p>Double-entry general ledger records, audit trail & balanced postings</p>
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
            New Journal Entry
          </button>
        </div>
      </div>

      {/* ── Metrics ── */}
      <div className="accounts-metrics-grid">
        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val">{metrics.count}</div>
            <div className="accounts-metric-lbl">Total Journal Postings</div>
          </div>
          <div className="accounts-metric-icon">
            <BookOpen size={20} />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val" style={{ color: '#67e8f9' }}>
              {formatCurrency(metrics.totalDebits, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Cumulative Debits</div>
          </div>
          <div className="accounts-metric-icon">
            <Scale size={20} color="#67e8f9" />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val" style={{ color: '#4ade80' }}>
              {formatCurrency(metrics.totalCredits, currency, usdToPkrRate)}
            </div>
            <div className="accounts-metric-lbl">Cumulative Credits</div>
          </div>
          <div className="accounts-metric-icon">
            <Scale size={20} color="#4ade80" />
          </div>
        </div>

        <div className="accounts-metric-card">
          <div>
            <div className="accounts-metric-val" style={{ color: '#fbbf24' }}>
              100%
            </div>
            <div className="accounts-metric-lbl">Ledger In-Balance Status</div>
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
            placeholder="Search entries by #, account code, or description…"
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
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">All Sources</option>
            <option value="invoice">Invoices</option>
            <option value="payment">Payments</option>
            <option value="revenue_recognition">Revenue Recognition</option>
            <option value="manual">Manual</option>
          </select>

          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
            {filtered.length} entries
          </span>
        </div>
      </div>

      {/* ── Journal Entries Table ── */}
      {loading ? (
        <div className="accounts-empty-state">
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
          <h3>Loading journal entries…</h3>
        </div>
      ) : filtered.length === 0 ? (
        <div className="accounts-empty-state">
          <BookOpen size={48} />
          <h3>No journal entries found</h3>
          <p>Journal entries are automatically posted as invoices, payments, and recognitions occur.</p>
          <button className="btn-accounts-primary" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> New Journal Entry
          </button>
        </div>
      ) : (
        <div className="accounts-table-wrapper">
          <table className="accounts-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Entry #</th>
                <th>Date</th>
                <th>Source Type</th>
                <th>Description</th>
                <th>Debits</th>
                <th>Credits</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const isExpanded = expandedIds.has(entry.id);
                const totalDebit = (entry.lines || []).reduce((s, l) => s + (Number(l.debit_pkr) || 0), 0);
                const totalCredit = (entry.lines || []).reduce((s, l) => s + (Number(l.credit_pkr) || 0), 0);

                let badgeColor = 'acct-badge asset';
                if (entry.source_type === 'payment') badgeColor = 'acct-badge revenue';
                if (entry.source_type === 'revenue_recognition') badgeColor = 'acct-badge equity';
                if (entry.source_type === 'manual') badgeColor = 'acct-badge expense';

                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleExpand(entry.id)}
                    >
                      {/* Chevron */}
                      <td>
                        {isExpanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
                      </td>

                      {/* Number */}
                      <td>
                        <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>
                          {entry.entry_number}
                        </strong>
                      </td>

                      {/* Date */}
                      <td>{entry.entry_date}</td>

                      {/* Source */}
                      <td>
                        <span className={badgeColor} style={{ textTransform: 'capitalize' }}>
                          {entry.source_type.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Description */}
                      <td>
                        <strong>{entry.description}</strong>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {entry.lines?.length || 0} line items
                        </div>
                      </td>

                      {/* Debits */}
                      <td>
                        <strong style={{ color: '#0284c7' }}>
                          {formatCurrency(totalDebit, currency, usdToPkrRate)}
                        </strong>
                      </td>

                      {/* Credits */}
                      <td>
                        <strong style={{ color: '#16a34a' }}>
                          {formatCurrency(totalCredit, currency, usdToPkrRate)}
                        </strong>
                      </td>
                    </tr>

                    {/* Expandable Line Items */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={7} style={{ padding: '0 0 16px 40px' }}>
                          <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', marginTop: '8px' }}>
                            <thead>
                              <tr style={{ color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
                                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Account</th>
                                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Description</th>
                                <th style={{ textAlign: 'right', padding: '6px 8px' }}>Debit</th>
                                <th style={{ textAlign: 'right', padding: '6px 8px' }}>Credit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(entry.lines || []).map((line) => (
                                <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '6px 8px' }}>
                                    <strong style={{ color: '#0f172a' }}>{line.account_code}</strong> — {line.account_name}
                                  </td>
                                  <td style={{ padding: '6px 8px', color: '#64748b' }}>
                                    {line.description || '—'}
                                  </td>
                                  <td style={{ textAlign: 'right', padding: '6px 8px', color: Number(line.debit_pkr) > 0 ? '#0284c7' : '#94a3b8', fontWeight: Number(line.debit_pkr) > 0 ? 700 : 400 }}>
                                    {Number(line.debit_pkr) > 0 ? formatCurrency(line.debit_pkr, currency, usdToPkrRate) : '—'}
                                  </td>
                                  <td style={{ textAlign: 'right', padding: '6px 8px', color: Number(line.credit_pkr) > 0 ? '#16a34a' : '#94a3b8', fontWeight: Number(line.credit_pkr) > 0 ? 700 : 400 }}>
                                    {Number(line.credit_pkr) > 0 ? formatCurrency(line.credit_pkr, currency, usdToPkrRate) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Manual Journal Entry Modal ── */}
      {modalOpen && (
        <>
          <div className="accounts-slideover-backdrop" onClick={() => setModalOpen(false)} />
          <div className="accounts-slideover" style={{ width: '580px' }}>
            <div className="accounts-slideover-header">
              <h2>New Manual Journal Entry</h2>
              <button className="accounts-slideover-close" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="accounts-slideover-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="accounts-form-field">
                  <label className="accounts-form-label">Entry Date</label>
                  <input
                    type="date"
                    className="accounts-form-input"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="accounts-form-field">
                <label className="accounts-form-label">
                  Description <span className="required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly office rent adjustment or supplies expense"
                  className="accounts-form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Lines Editor */}
              <div className="accounts-form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="accounts-form-label">Journal Lines</label>
                  <button
                    type="button"
                    className="btn-accounts-ghost"
                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    onClick={addLine}
                  >
                    <Plus size={12} /> Add Line
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {lines.map((l, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr auto',
                        gap: '6px',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.04)',
                        padding: '6px 8px',
                        borderRadius: '8px',
                      }}
                    >
                      <select
                        className="accounts-form-select"
                        style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                        value={l.account_code}
                        onChange={(e) => {
                          const updated = [...lines];
                          updated[index].account_code = e.target.value;
                          setLines(updated);
                        }}
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.code}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        placeholder="Debit"
                        min="0"
                        className="accounts-form-input"
                        style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                        value={l.debit_pkr || ''}
                        onChange={(e) => {
                          const updated = [...lines];
                          updated[index].debit_pkr = Number(e.target.value) || 0;
                          if (Number(e.target.value) > 0) updated[index].credit_pkr = 0;
                          setLines(updated);
                        }}
                      />

                      <input
                        type="number"
                        placeholder="Credit"
                        min="0"
                        className="accounts-form-input"
                        style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                        value={l.credit_pkr || ''}
                        onChange={(e) => {
                          const updated = [...lines];
                          updated[index].credit_pkr = Number(e.target.value) || 0;
                          if (Number(e.target.value) > 0) updated[index].debit_pkr = 0;
                          setLines(updated);
                        }}
                      />

                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        onClick={() => removeLine(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Summary Box */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${formDifference > 0.05 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)'}`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span>Total Debits: <strong>Rs {totalFormDebit.toLocaleString()}</strong></span>
                  <span>Total Credits: <strong>Rs {totalFormCredit.toLocaleString()}</strong></span>
                </div>
                <div style={{ marginTop: '6px', fontSize: '0.74rem', color: formDifference > 0.05 ? '#f87171' : '#4ade80' }}>
                  {formDifference > 0.05
                    ? `Difference: Rs ${formDifference.toLocaleString()} (Entry must balance)`
                    : 'Balanced ✓'}
                </div>
              </div>
            </div>

            <div className="accounts-slideover-footer">
              <button className="btn-accounts-ghost" onClick={() => setModalOpen(false)} disabled={submitting}>
                Cancel
              </button>
              <button
                className="btn-accounts-primary"
                onClick={handleCreateEntry}
                disabled={submitting || formDifference > 0.05}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Posting…
                  </>
                ) : (
                  'Post Journal Entry'
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
