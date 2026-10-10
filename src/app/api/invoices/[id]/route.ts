import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/invoices/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getSupabase();
    const { id } = params;

    const { data: invoice, error } = await db
      .from('invoices')
      .select(`
        *,
        subscriber:subscribers(*),
        patient:patients(*),
        subscription:subscriptions(*),
        line_items:invoice_line_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    // Fetch payments made against this invoice
    const { data: payments } = await db
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .order('payment_date', { ascending: false });

    return NextResponse.json({ invoice, payments: payments || [] });
  } catch (err: any) {
    console.error('Error fetching invoice:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/invoices/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getSupabase();
    const { id } = params;
    const body = await request.json();
    const { status, notes, due_date } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (due_date) updates.due_date = due_date;

    const { data, error } = await db
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, invoice: data });
  } catch (err: any) {
    console.error('Error updating invoice:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/invoices/[id] — Never hard-delete; cancel invoice
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getSupabase();
    const { id } = params;

    const { data, error } = await db
      .from('invoices')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, invoice: data });
  } catch (err: any) {
    console.error('Error cancelling invoice:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
