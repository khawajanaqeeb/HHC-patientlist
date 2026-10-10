import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/medicine-dispensing?patientId=...&startDate=...&endDate=...&unbilled=true
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId')?.trim() || '';
    const startDate = searchParams.get('startDate')?.trim() || '';
    const endDate = searchParams.get('endDate')?.trim() || '';
    const unbilled = searchParams.get('unbilled') === 'true';

    let query = db
      .from('medicine_dispensing')
      .select('*, patient:patients(id, patient_code, name)')
      .order('dispensed_date', { ascending: false });

    if (patientId) query = query.eq('patient_id', patientId);
    if (startDate) query = query.gte('dispensed_date', startDate);
    if (endDate) query = query.lte('dispensed_date', endDate);
    if (unbilled) query = query.is('invoice_id', null);

    const { data, error } = await query;
    if (error) {
      console.warn('Medicine dispensing query error:', error.message);
      return NextResponse.json({ records: [] });
    }

    return NextResponse.json({ records: data || [] });
  } catch (err: any) {
    console.error('Error fetching medicine dispensing:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/medicine-dispensing
export async function POST(request: NextRequest) {
  try {
    const db = getSupabase();
    const body = await request.json();
    const {
      patient_id,
      medicine_name,
      quantity = 1,
      unit_price_pkr = 0,
      dispensed_date,
      prescribing_doctor,
      notes,
    } = body;

    if (!patient_id || !medicine_name?.trim()) {
      return NextResponse.json(
        { error: 'patient_id and medicine_name are required' },
        { status: 400 }
      );
    }

    const qty = Number(quantity) || 1;
    const unitPrice = Number(unit_price_pkr) || 0;
    const totalPrice = qty * unitPrice;

    const payload = {
      patient_id,
      medicine_name: medicine_name.trim(),
      quantity: qty,
      unit_price_pkr: unitPrice,
      total_price_pkr: totalPrice,
      dispensed_date: dispensed_date || new Date().toISOString().split('T')[0],
      prescribing_doctor: prescribing_doctor?.trim() || null,
      notes: notes?.trim() || null,
    };

    const { data, error } = await db.from('medicine_dispensing').insert(payload).select().single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, record: data }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating medicine dispensing record:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
