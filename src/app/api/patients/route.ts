import { NextRequest, NextResponse } from 'next/server';
import { addPatient } from '@/lib/db';
import { isMonthId } from '@/lib/validation';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/patients?search=...&subscriberId=...
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const subscriberId = searchParams.get('subscriberId')?.trim() || '';

    // First try master patients table
    let query = db
      .from('patients')
      .select('id, patient_code, legacy_patient_id, name, subscriber_id, subscriber_name, subscriber_email, father_husband_name, dob, gender, address, google_address_location, assigned_doctor, photo_path, is_active')
      .order('legacy_patient_id', { ascending: true });

    if (subscriberId) {
      query = query.eq('subscriber_id', subscriberId);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,patient_code.ilike.%${search}%,subscriber_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      // Fallback to distinct month_patients
      const { data: monthData, error: mErr } = await db
        .from('month_patients')
        .select('patient_id, name, subscriber, subscriber_email, father_husband_name, dob, gender, address, google_address_location, assigned_doctor, photo_path, is_active')
        .order('month_id', { ascending: false });
      if (mErr) throw new Error(mErr.message);

      const seen = new Set<number>();
      const list = (monthData || []).filter((r) => {
        const pid = Number(r.patient_id);
        if (seen.has(pid)) return false;
        seen.add(pid);
        return true;
      }).map((r) => ({
        id: String(r.patient_id),
        patient_code: `P-${String(r.patient_id).padStart(3, '0')}`,
        legacy_patient_id: r.patient_id,
        name: r.name,
        subscriber_id: null,
        subscriber_name: r.subscriber,
        subscriber_email: r.subscriber_email,
        father_husband_name: r.father_husband_name,
        dob: r.dob,
        gender: r.gender,
        address: r.address,
        google_address_location: r.google_address_location,
        assigned_doctor: r.assigned_doctor,
        photo_path: r.photo_path,
        is_active: r.is_active ?? true,
      }));

      let filtered = list;
      if (search) {
        filtered = filtered.filter((p) =>
          p.name?.toLowerCase().includes(search) ||
          p.patient_code.toLowerCase().includes(search) ||
          p.subscriber_name?.toLowerCase().includes(search)
        );
      }
      return NextResponse.json({ patients: filtered });
    }

    return NextResponse.json({ patients: data || [] });
  } catch (error: any) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      monthId,
      name,
      subscriber,
      packageId,
      subscriberEmail,
      fatherHusbandName,
      dob,
      gender,
      address,
      googleAddressLocation,
      assignedDoctor,
    } = body;

    if (!isMonthId(monthId) || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Month ID and Patient Name are required' }, { status: 400 });
    }

    if (packageId !== null && packageId !== undefined && (!Number.isInteger(packageId) || packageId < 1)) {
      return NextResponse.json({ error: 'Package ID must be a positive integer or null' }, { status: 400 });
    }
    const patient = await addPatient(
      monthId,
      name.trim(),
      typeof subscriber === 'string' ? subscriber.trim() : '',
      packageId ?? null,
      {
        subscriberEmail: typeof subscriberEmail === 'string' ? subscriberEmail.trim() : '',
        fatherHusbandName: typeof fatherHusbandName === 'string' ? fatherHusbandName.trim() : '',
        dob: typeof dob === 'string' ? dob.trim() : '',
        gender: typeof gender === 'string' ? gender.trim() : '',
        address: typeof address === 'string' ? address.trim() : '',
        googleAddressLocation: typeof googleAddressLocation === 'string' ? googleAddressLocation.trim() : '',
        assignedDoctor: typeof assignedDoctor === 'string' ? assignedDoctor.trim() : '',
      }
    );
    return NextResponse.json({ success: true, patient });
  } catch (error: any) {
    console.error('Error adding patient:', error);
    return NextResponse.json({ error: error.message || 'Failed to add patient' }, { status: 500 });
  }
}
