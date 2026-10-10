'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  DollarSign,
  Share2,
} from 'lucide-react';
import { formatCurrency, formatDualCurrency } from '@/lib/currency';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');

  useEffect(() => {
    async function loadInvoice() {
      try {
        setLoading(true);
        const res = await fetch(`/api/invoices/${params.id}`);
        if (!res.ok) {
          router.replace('/accounts/invoices');
          return;
        }
        const data = await res.json();
        setInvoice(data.invoice);
        setPayments(data.payments || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [params.id, router]);

  if (loading || !invoice) {
    return (
      <div className="accounts-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const rate = Number(invoice.exchange_rate_usd) || 278.50;
  const dualTotal = formatDualCurrency(invoice.total_pkr || 0, rate);
  const dualPaid = formatDualCurrency(invoice.paid_pkr || 0, rate);
  const dualBalance = formatDualCurrency(invoice.balance_pkr || 0, rate);

  return (
    <div className="accounts-page" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* ── Top Bar (Hidden in Print) ── */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <button
          className="btn-accounts-ghost"
          onClick={() => router.push('/accounts/invoices')}
        >
          <ArrowLeft size={15} /> Back to Invoices
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
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

          <button className="btn-accounts-primary" onClick={() => window.print()}>
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* ── Formal Invoice Document Card ── */}
      <div
        style={{
          background: '#ffffff',
          color: '#1e293b',
          borderRadius: '16px',
          padding: '40px 48px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '24px', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '36px', height: '36px', background: '#0284c7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800 }}>
                HHC
              </div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                HUMAN HEALTHCARE
              </h1>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
              Patient Care, Home Clinical Visits & Health Plans
            </p>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Lahore, Pakistan • info@humanhealthcare.pk
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: invoice.status === 'paid' ? '#dcfce7' : '#fee2e2',
                color: invoice.status === 'paid' ? '#15803d' : '#b91c1c',
                padding: '4px 12px',
                borderRadius: '20px',
              }}
            >
              {invoice.status.replace('_', ' ')}
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace', marginTop: '8px' }}>
              {invoice.invoice_number}
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              Issue Date: <strong>{invoice.issue_date}</strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Due Date: <strong>{invoice.due_date}</strong>
            </div>
          </div>
        </div>

        {/* Bill To & Patient Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '32px' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
              Billed To (Subscriber)
            </span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
              {invoice.subscriber?.name || 'Subscriber'}
            </div>
            {invoice.subscriber?.email && (
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                {invoice.subscriber.email}
              </div>
            )}
            {invoice.subscriber?.phone && (
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                {invoice.subscriber.phone}
              </div>
            )}
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
              Care Beneficiary (Patient)
            </span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
              {invoice.patient?.name || 'Patient'}
            </div>
            {invoice.patient?.patient_code && (
              <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
                Patient Code: {invoice.patient.patient_code}
              </div>
            )}
            {invoice.patient?.address && (
              <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                {invoice.patient.address}
              </div>
            )}
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                Description
              </th>
              <th style={{ textAlign: 'center', padding: '12px 14px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                Qty
              </th>
              <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                Unit Price
              </th>
              <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {(invoice.line_items || []).length === 0 ? (
              <tr>
                <td style={{ padding: '14px', borderBottom: '1px solid #e2e8f0' }}>
                  Health Care Plan Subscription Fee
                </td>
                <td style={{ textAlign: 'center', padding: '14px', borderBottom: '1px solid #e2e8f0' }}>1</td>
                <td style={{ textAlign: 'right', padding: '14px', borderBottom: '1px solid #e2e8f0' }}>
                  {formatCurrency(invoice.total_pkr, currency, rate)}
                </td>
                <td style={{ textAlign: 'right', padding: '14px', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>
                  {formatCurrency(invoice.total_pkr, currency, rate)}
                </td>
              </tr>
            ) : (
              invoice.line_items.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px', fontSize: '0.85rem' }}>
                    <strong>{item.description}</strong>
                  </td>
                  <td style={{ textAlign: 'center', padding: '14px', fontSize: '0.85rem', color: '#64748b' }}>
                    {item.quantity || 1}
                  </td>
                  <td style={{ textAlign: 'right', padding: '14px', fontSize: '0.85rem', color: '#64748b' }}>
                    {formatCurrency(item.unit_price_pkr, currency, rate)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '14px', fontSize: '0.85rem', fontWeight: 700 }}>
                    {formatCurrency(item.total_price_pkr, currency, rate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Totals Section */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.total_pkr + (invoice.discount_pkr || 0), currency, rate)}</span>
            </div>

            {Number(invoice.discount_pkr) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a' }}>
                <span>Discount:</span>
                <span>-{formatCurrency(invoice.discount_pkr, currency, rate)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', borderTop: '2px solid #cbd5e1', paddingTop: '8px' }}>
              <span>Total Invoice Amount:</span>
              <span>{currency === 'PKR' ? dualTotal.pkr : dualTotal.usd}</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.74rem', color: '#64748b' }}>
              {currency === 'PKR' ? `≈ ${dualTotal.usd}` : `≈ ${dualTotal.pkr}`}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a', marginTop: '6px' }}>
              <span>Amount Paid:</span>
              <span>{formatCurrency(invoice.paid_pkr || 0, currency, rate)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: Number(invoice.balance_pkr) > 0 ? '#b91c1c' : '#15803d', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
              <span>Balance Due:</span>
              <span>{currency === 'PKR' ? dualBalance.pkr : dualBalance.usd}</span>
            </div>
          </div>
        </div>

        {/* Exchange Rate Stored Footnote */}
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', fontSize: '0.75rem', color: '#64748b', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <strong>Currency Exchange Note:</strong> This invoice stores an exchange rate of <strong>1 USD = {rate.toFixed(2)} PKR</strong> fixed at the date of issue ({invoice.issue_date}).
        </div>

        {/* Footer Notes */}
        {invoice.notes && (
          <div style={{ fontSize: '0.8rem', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <strong>Payment Instructions & Notes:</strong>
            <p style={{ marginTop: '4px', whiteSpace: 'pre-line' }}>{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
