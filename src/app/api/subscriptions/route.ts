import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/subscriptions?search=...&status=...&subscriberId=...
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const status = searchParams.get('status')?.trim() || '';
    const subscriberId = searchParams.get('subscriberId')?.trim() || '';
    const patientId = searchParams.get('patientId')?.trim() || '';

    let query = db
      .from('subscriptions')
      .select(`
        id,
        subscription_code,
        subscriber_id,
        patient_id,
        plan_id,
        plan_name,
        billing_cycle,
        start_date,
        end_date,
        price_pkr,
        status,
        total_recognized_pkr,
        notes,
        created_at,
        subscriber:subscribers(id, name, email, phone),
        patient:patients(id, patient_code, name, address, assigned_doctor)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (subscriberId) {
      query = query.eq('subscriber_id', subscriberId);
    }
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query;
    if (error) {
      // Return empty array gracefully if table is not yet migrated in Supabase
      console.warn('Subscriptions table error or not yet created:', error.message);
      return NextResponse.json({ subscriptions: [] });
    }

    let list = data || [];
    if (search) {
      list = list.filter((sub: any) =>
        sub.subscription_code?.toLowerCase().includes(search) ||
        sub.plan_name?.toLowerCase().includes(search) ||
        sub.subscriber?.name?.toLowerCase().includes(search) ||
        sub.patient?.name?.toLowerCase().includes(search) ||
        sub.patient?.patient_code?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ subscriptions: list });
  } catch (err: any) {
    console.error('Error in GET /api/subscriptions:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/subscriptions
export async function POST(request: NextRequest) {
  try {
    const db = getSupabase();
    const body = await request.json();
    const {
      subscriber_id,
      patient_id,
      plan_id,
      plan_name,
      billing_cycle = 'monthly',
      start_date,
      end_date,
      price_pkr,
      notes,
    } = body;

    if (!subscriber_id || !patient_id || !plan_id) {
      return NextResponse.json(
        { error: 'subscriber_id, patient_id, and plan_id are required' },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    // Generate next sequence number or fallback random code
    let code = `HHC-SUB-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const { data: seqData } = await db.rpc('nextval', { seq_name: 'public.hhc_subscription_seq' });
      if (seqData) {
        code = `HHC-SUB-${year}-${String(seqData).padStart(4, '0')}`;
      }
    } catch {
      // Fallback code if RPC is not enabled
    }

    const payload = {
      subscription_code: code,
      subscriber_id,
      patient_id,
      plan_id: Number(plan_id),
      plan_name: String(plan_name || 'Health Plan'),
      billing_cycle: billing_cycle || 'monthly',
      start_date: start_date || new Date().toISOString().split('T')[0],
      end_date: end_date || null,
      price_pkr: Number(price_pkr) || 0,
      status: 'active',
      total_recognized_pkr: 0,
      notes: notes || null,
    };

    const { data, error } = await db.from('subscriptions').insert(payload).select().single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, subscription: data }, { status: 201 });
  } catch (err: any) {
    console.error('Error in POST /api/subscriptions:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
