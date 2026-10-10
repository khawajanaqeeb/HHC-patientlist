import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postJournalEntry } from '@/lib/accounting';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/payments?invoiceId=...&subscriberId=...&search=...
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const invoiceId = searchParams.get('invoiceId')?.trim() || '';
    const subscriberId = searchParams.get('subscriberId')?.trim() || '';

    let query = db
      .from('payments')
      .select(`
        *,
        subscriber:subscribers(id, name, email, phone),
        invoice:invoices(id, invoice_number, total_pkr, balance_pkr),
        destination_account:accounts(id, code, name)
      `)
      .order('payment_date', { ascending: false });

    if (invoiceId) query = query.eq('invoice_id', invoiceId);
    if (subscriberId) query = query.eq('subscriber_id', subscriberId);

    const { data, error } = await query;
    if (error) {
      console.warn('Payments query error or table not yet migrated:', error.message);
      return NextResponse.json({ payments: [] });
    }

    let list = data || [];
    if (search) {
      list = list.filter((p: any) =>
        p.payment_number?.toLowerCase().includes(search) ||
        p.subscriber?.name?.toLowerCase().includes(search) ||
        p.invoice?.invoice_number?.toLowerCase().includes(search) ||
        p.payment_method?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ payments: list });
  } catch (err: any) {
    console.error('Error fetching payments:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/payments — Record payment against invoice & auto-post double-entry journal
export async function POST(request: NextRequest) {
  try {
    const db = getSupabase();
    const body = await request.json();
    const {
      invoice_id,
      amount_pkr,
      payment_date = new Date().toISOString().split('T')[0],
      payment_method = 'bank_transfer',
      destination_account_id,
      destination_account_code = '1020', // Default: Bank Account Main
      reference_note,
      exchange_rate_usd = 278.50,
    } = body;

    const amount = Number(amount_pkr);
    if (!invoice_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'invoice_id and a positive amount_pkr are required' },
        { status: 400 }
      );
    }

    // 1. Fetch current invoice
    const { data: invoice, error: invErr } = await db
      .from('invoices')
      .select('id, invoice_number, subscriber_id, total_pkr, paid_pkr, balance_pkr')
      .eq('id', invoice_id)
      .single();

    if (invErr || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const year = new Date().getFullYear();
    const payNumber = `HHC-PAY-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Insert Payment Record
    const { data: payment, error: payErr } = await db
      .from('payments')
      .insert({
        payment_number: payNumber,
        invoice_id: invoice.id,
        subscriber_id: invoice.subscriber_id,
        payment_date,
        amount_pkr: amount,
        exchange_rate_usd: Number(exchange_rate_usd) || 278.50,
        payment_method,
        destination_account_id: destination_account_id || null,
        reference_note: reference_note || null,
      })
      .select()
      .single();

    if (payErr) throw new Error(payErr.message);

    // 3. Update Invoice Balance & Status
    const newPaid = Number(invoice.paid_pkr) + amount;
    const newBalance = Math.max(0, Number(invoice.total_pkr) - newPaid);
    const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

    await db
      .from('invoices')
      .update({
        paid_pkr: newPaid,
        balance_pkr: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    // 4. Auto-post Double-Entry Journal Entry
    // Debit Cash / Bank Account (1010 or 1020)
    // Credit Accounts Receivable (1110)
    try {
      const targetAcctCode =
        payment_method === 'cash' ? '1010' : destination_account_code || '1020';

      await postJournalEntry({
        source_type: 'payment',
        source_id: payment.id,
        description: `Payment ${payment.payment_number} received for Invoice ${invoice.invoice_number}`,
        entry_date: payment_date,
        lines: [
          {
            account_code: targetAcctCode,
            debit_pkr: amount,
            credit_pkr: 0,
            description: `Cash/Bank Received — Payment ${payment.payment_number}`,
          },
          {
            account_code: '1110',
            debit_pkr: 0,
            credit_pkr: amount,
            description: `AR Relieved — Payment ${payment.payment_number}`,
          },
        ],
      });
    } catch (jnlErr: any) {
      console.warn('Note: Payment journal entry warning:', jnlErr.message);
    }

    return NextResponse.json({ success: true, payment, invoice_status: newStatus }, { status: 201 });
  } catch (err: any) {
    console.error('Error recording payment:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
