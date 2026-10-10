import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/lab-orders?patientId=...&startDate=...&endDate=...&unbilled=true
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId')?.trim() || '';
    const startDate = searchParams.get('startDate')?.trim() || '';
    const endDate = searchParams.get('endDate')?.trim() || '';
    const unbilled = searchParams.get('unbilled') === 'true';

    let query = db
      .from('lab_orders')
      .select('*, patient:patients(id, patient_code, name)')
      .order('order_date', { ascending: false });

    if (patientId) query = query.eq('patient_id', patientId);
    if (startDate) query = query.gte('order_date', startDate);
    if (endDate) query = query.lte('order_date', endDate);
    if (unbilled) query = query.is('invoice_id', null);

    const { data, error } = await query;
    if (error) {
      console.warn('Lab orders query error:', error.message);
      return NextResponse.json({ records: [] });
    }

    return NextResponse.json({ records: data || [] });
  } catch (err: any) {
    console.error('Error fetching lab orders:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/lab-orders
export async function POST(request: NextRequest) {
  try {
    const db = getSupabase();
    const body = await request.json();
    const {
      patient_id,
      test_name,
      price_pkr = 0,
      cost_to_hhc_pkr = 0,
      partner_lab,
      is_included_in_plan = false,
      order_date,
      notes,
    } = body;

    if (!patient_id || !test_name?.trim()) {
      return NextResponse.json(
        { error: 'patient_id and test_name are required' },
        { status: 400 }
      );
    }

    const payload = {
      patient_id,
      test_name: test_name.trim(),
      price_pkr: Number(price_pkr) || 0,
      cost_to_hhc_pkr: Number(cost_to_hhc_pkr) || 0,
      partner_lab: partner_lab?.trim() || null,
      is_included_in_plan: Boolean(is_included_in_plan),
      order_date: order_date || new Date().toISOString().split('T')[0],
      notes: notes?.trim() || null,
    };

    const { data, error } = await db.from('lab_orders').insert(payload).select().single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, record: data }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating lab order record:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
