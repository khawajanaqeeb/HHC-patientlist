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

    // Accept both snake_case (profile pages) and camelCase (visit sheet) keys
    const pick = (snake: string, camel: string) =>
      body[snake] !== undefined ? body[snake] : body[camel];

    const update: Record<string, unknown> = {};
    if ('photo_path' in body) update.photo_path = body.photo_path ?? null;
    if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.subscriber !== undefined) update.subscriber = String(body.subscriber).trim();
    if (body.gender !== undefined) update.gender = body.gender || '';
    if (body.dob !== undefined) update.dob = body.dob || '';
    if (body.address !== undefined) update.address = body.address || '';
    const doctor = pick('assigned_doctor', 'assignedDoctor');
    if (doctor !== undefined) update.assigned_doctor = doctor || '';
    const email = pick('subscriber_email', 'subscriberEmail');
    if (email !== undefined) update.subscriber_email = email || '';
    const fh = pick('father_husband_name', 'fatherHusbandName');
    if (fh !== undefined) update.father_husband_name = fh || '';
    const loc = pick('google_address_location', 'googleAddressLocation');
    if (loc !== undefined) update.google_address_location = loc || '';

    if ('packageId' in body || 'package_id' in body) {
      const pkg = pick('package_id', 'packageId');
      if (pkg !== null && pkg !== undefined && (!Number.isInteger(Number(pkg)) || Number(pkg) < 1)) {
        return NextResponse.json({ error: 'Invalid package ID.' }, { status: 400 });
      }
      update.package_id = pkg === null || pkg === undefined ? null : Number(pkg);
    }
    const med = pick('med_given', 'medGiven');
    if (med !== undefined) update.med_given = Math.max(0, Number(med) || 0);
    if (body.v !== undefined) {
      if (!Array.isArray(body.v)) {
        return NextResponse.json({ error: 'Invalid visits data.' }, { status: 400 });
      }
      update.visits_json = body.v;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true });
    }

    const monthId = typeof body.monthId === 'string' ? body.monthId : null;
    let query = db.from('month_patients').update(update).eq('patient_id', patientId);
    if (monthId) query = query.eq('month_id', monthId);
    const { data: updated, error } = await query.select('patient_id');

    if (error) throw new Error(error.message);
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/patients/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getSupabase();
    const patientId = Number(id);
    if (isNaN(patientId)) {
      return NextResponse.json({ error: 'Invalid patient ID.' }, { status: 400 });
    }

    // Scope to the current month when provided (visit sheet); otherwise delete everywhere
    const monthId = new URL(request.url).searchParams.get('monthId');
    let query = db.from('month_patients').delete().eq('patient_id', patientId);
    if (monthId) query = query.eq('month_id', monthId);
    const { error } = await query;

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}