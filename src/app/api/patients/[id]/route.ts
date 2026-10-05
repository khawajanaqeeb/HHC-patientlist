import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/patients/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getSupabase();
    const patientId = Number(id);
    if (isNaN(patientId)) {
      return NextResponse.json({ error: 'Invalid patient ID.' }, { status: 400 });
    }

    const { data, error } = await db
      .from('month_patients')
      .select('patient_id, month_id, name, subscriber, subscriber_email, father_husband_name, dob, gender, address, google_address_location, assigned_doctor, package_id, med_given, photo_path, is_active, visits_json')
      .eq('patient_id', patientId)
      .order('month_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });

    // Default is_active to true if null
    const patientData = { ...data, is_active: data.is_active ?? true };

    const { data: allMonths } = await db
      .from('month_patients')
      .select('month_id')
      .eq('patient_id', patientId)
      .order('month_id', { ascending: false });

    return NextResponse.json({ patient: patientData, months: (allMonths || []).map((r: any) => r.month_id) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/patients/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getSupabase();
    const patientId = Number(id);
    if (isNaN(patientId)) {
      return NextResponse.json({ error: 'Invalid patient ID.' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if ('photo_path' in body) update.photo_path = body.photo_path ?? null;
    if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.subscriber !== undefined) update.subscriber = String(body.subscriber).trim();
    if (body.gender !== undefined) update.gender = body.gender || '';
    if (body.dob !== undefined) update.dob = body.dob || '';
    if (body.address !== undefined) update.address = body.address || '';
    if (body.assigned_doctor !== undefined) update.assigned_doctor = body.assigned_doctor || '';
    if (body.subscriber_email !== undefined) update.subscriber_email = body.subscriber_email || '';
    if (body.father_husband_name !== undefined) update.father_husband_name = body.father_husband_name || '';
    if (body.google_address_location !== undefined) update.google_address_location = body.google_address_location || '';

    const { error } = await db
      .from('month_patients')
      .update(update)
      .eq('patient_id', patientId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}