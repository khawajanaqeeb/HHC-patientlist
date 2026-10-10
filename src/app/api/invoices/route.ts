import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postJournalEntry } from '@/lib/accounting';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/invoices?subscriberId=...&status=...&search=...
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const status = searchParams.get('status')?.trim() || '';
    const subscriberId = searchParams.get('subscriberId')?.trim() || '';

    let query = db
      .from('invoices')
      .select(`
        *,
        subscriber:subscribers(id, name, email, phone),
        patient:patients(id, patient_code, name),
        line_items:invoice_line_items(*)
      `)
      .order('issue_date', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (subscriberId) {
      query = query.eq('subscriber_id', subscriberId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Invoices query error or table not yet migrated:', error.message);
      return NextResponse.json({ invoices: [] });
    }

    let list = (data || []).map((inv: any) => {
      // Auto-calculate overdue if past due date and balance > 0
      const today = new Date().toISOString().split('T')[0];
      const isOverdue = inv.status === 'sent' && inv.due_date < today && Number(inv.balance_pkr) > 0;
      return {
        ...inv,
        status: isOverdue ? 'overdue' : inv.status,
      };
    });

    if (search) {
      list = list.filter((inv: any) =>
        inv.invoice_number?.toLowerCase().includes(search) ||
        inv.subscriber?.name?.toLowerCase().includes(search) ||
        inv.patient?.name?.toLowerCase().includes(search) ||
        inv.patient?.patient_code?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ invoices: list });
  } catch (err: any) {
    console.error('Error fetching invoices:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/invoices — Create invoice with line items and auto-post double-entry journal
export async function POST(request: NextRequest) {
  try {
    const db = getSupabase();
    const body = await request.json();
    const {
      subscriber_id,
      patient_id,
      subscription_id,
      issue_date = new Date().toISOString().split('T')[0],
      due_date,
      plan_fee_pkr = 0,
      excess_medicine_pkr = 0,
      lab_charges_pkr = 0,
      discount_pkr = 0,
      tax_pkr = 0,
      exchange_rate_usd = 278.50,
      notes,
      medicine_ids = [], // Array of medicine_dispensing UUIDs billed
      lab_ids = [],      // Array of lab_orders UUIDs billed
      custom_line_items = [], // Optional custom line items
    } = body;

    if (!subscriber_id) {
      return NextResponse.json({ error: 'subscriber_id is required' }, { status: 400 });
    }

    const calculatedTotal =
      Number(plan_fee_pkr) +
      Number(excess_medicine_pkr) +
      Number(lab_charges_pkr) -
      Number(discount_pkr) +
      Number(tax_pkr);

    const year = new Date().getFullYear();
    const invNumber = `HHC-INV-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Default due date: 7 days from issue date if not given
    const calculatedDueDate =
      due_date ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. Create Invoice Record
    const { data: invoice, error: invErr } = await db
      .from('invoices')
      .insert({
        invoice_number: invNumber,
        subscriber_id,
        patient_id: patient_id || null,
        subscription_id: subscription_id || null,
        issue_date,
        due_date: calculatedDueDate,
        currency: 'PKR',
        exchange_rate_usd: Number(exchange_rate_usd) || 278.50,
        plan_fee_pkr: Number(plan_fee_pkr) || 0,
        excess_medicine_pkr: Number(excess_medicine_pkr) || 0,
        lab_charges_pkr: Number(lab_charges_pkr) || 0,
        discount_pkr: Number(discount_pkr) || 0,
        tax_pkr: Number(tax_pkr) || 0,
        total_pkr: calculatedTotal,
        paid_pkr: 0,
        balance_pkr: calculatedTotal,
        status: 'sent',
        notes: notes || null,
      })
      .select()
      .single();

    if (invErr) throw new Error(invErr.message);

    // 2. Insert Standard Line Items
    const lineItemsToInsert: any[] = [];
    if (Number(plan_fee_pkr) > 0) {
      lineItemsToInsert.push({
        invoice_id: invoice.id,
        description: 'Health Plan Subscription Fee',
        item_type: 'plan_fee',
        quantity: 1,
        unit_price_pkr: Number(plan_fee_pkr),
        total_price_pkr: Number(plan_fee_pkr),
      });
    }
    if (Number(excess_medicine_pkr) > 0) {
      lineItemsToInsert.push({
        invoice_id: invoice.id,
        description: 'Medicine — Excess Dispensed over Plan Limit',
        item_type: 'excess_medicine',
        quantity: 1,
        unit_price_pkr: Number(excess_medicine_pkr),
        total_price_pkr: Number(excess_medicine_pkr),
      });
    }
    if (Number(lab_charges_pkr) > 0) {
      lineItemsToInsert.push({
        invoice_id: invoice.id,
        description: 'Billable Diagnostic & Pathology Lab Tests',
        item_type: 'lab_test',
        quantity: 1,
        unit_price_pkr: Number(lab_charges_pkr),
        total_price_pkr: Number(lab_charges_pkr),
      });
    }
    if (Array.isArray(custom_line_items) && custom_line_items.length > 0) {
      custom_line_items.forEach((item) => {
        lineItemsToInsert.push({
          invoice_id: invoice.id,
          description: item.description || 'Service',
          item_type: item.item_type || 'other',
          quantity: item.quantity || 1,
          unit_price_pkr: item.unit_price_pkr || 0,
          total_price_pkr: item.total_price_pkr || 0,
        });
      });
    }

    if (lineItemsToInsert.length > 0) {
      await db.from('invoice_line_items').insert(lineItemsToInsert);
    }

    // 3. Mark medicine records and lab orders as billed with this invoice_id
    if (medicine_ids.length > 0) {
      await db.from('medicine_dispensing').update({ invoice_id: invoice.id }).in('id', medicine_ids);
    }
    if (lab_ids.length > 0) {
      await db.from('lab_orders').update({ invoice_id: invoice.id }).in('id', lab_ids);
    }

    // 4. Auto-post Double-Entry Journal Entry
    // Debit AR (1110)
    // Credit Unearned Revenue (2050) for plan fee
    // Credit Medicine Revenue (4070) for excess medicine
    // Credit Lab Test Revenue (4060) for lab charges
    try {
      const journalLines = [
        {
          account_code: '1110',
          debit_pkr: calculatedTotal,
          credit_pkr: 0,
          description: `Accounts Receivable — Invoice ${invoice.invoice_number}`,
        },
      ];

      if (Number(plan_fee_pkr) > 0) {
        journalLines.push({
          account_code: '2050',
          debit_pkr: 0,
          credit_pkr: Number(plan_fee_pkr),
          description: `Unearned Revenue — Invoice ${invoice.invoice_number}`,
        });
      }
      if (Number(excess_medicine_pkr) > 0) {
        journalLines.push({
          account_code: '4070',
          debit_pkr: 0,
          credit_pkr: Number(excess_medicine_pkr),
          description: `Medicine Excess Revenue — Invoice ${invoice.invoice_number}`,
        });
      }
      if (Number(lab_charges_pkr) > 0) {
        journalLines.push({
          account_code: '4060',
          debit_pkr: 0,
          credit_pkr: Number(lab_charges_pkr),
          description: `Lab Test Revenue — Invoice ${invoice.invoice_number}`,
        });
      }

      await postJournalEntry({
        source_type: 'invoice',
        source_id: invoice.id,
        description: `Invoice ${invoice.invoice_number} Issued to Subscriber`,
        entry_date: issue_date,
        lines: journalLines,
      });
    } catch (jnlErr: any) {
      console.warn('Note: Journal entry auto-post warning:', jnlErr.message);
    }

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating invoice:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
