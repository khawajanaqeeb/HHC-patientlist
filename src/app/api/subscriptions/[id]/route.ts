import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/subscriptions/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getSupabase();
    const { id } = params;

    const { data: sub, error } = await db
      .from('subscriptions')
      .select(`
        *,
        subscriber:subscribers(*),
        patient:patients(*),
        plan:plans(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

    // Also fetch associated invoices & recognitions
    const [invRes, recRes] = await Promise.all([
      db.from('invoices').select('*').eq('subscription_id', id).order('issue_date', { ascending: false }),
      db.from('revenue_recognitions').select('*').eq('subscription_id', id).order('period_month', { ascending: false }),
    ]);

    return NextResponse.json({
      subscription: sub,
      invoices: invRes.data || [],
      recognitions: recRes.data || [],
    });
  } catch (err: any) {
    console.error('Error fetching subscription:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/subscriptions/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getSupabase();
    const { id } = params;
    const body = await request.json();
    const { status, end_date, notes, price_pkr } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updates.status = status;
    if (end_date !== undefined) updates.end_date = end_date || null;
    if (notes !== undefined) updates.notes = notes || null;
    if (price_pkr !== undefined) updates.price_pkr = Number(price_pkr);

    const { data, error } = await db
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, subscription: data });
  } catch (err: any) {
    console.error('Error updating subscription:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/subscriptions/[id] — marks cancelled
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getSupabase();
    const { id } = params;

    const { data, error } = await db
      .from('subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, subscription: data });
  } catch (err: any) {
    console.error('Error cancelling subscription:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
