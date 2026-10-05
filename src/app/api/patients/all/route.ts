import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/patients/all?search=...&gender=...&month=...
// Returns a flat list of all unique patients with their most recent data
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const genderFilter = searchParams.get('gender') || '';
    const statusFilter = searchParams.get('status') || '';
    const monthFilter = searchParams.get('month') || '';

    let query = db
      .from('month_patients')
      .select('patient_id, month_id, name, subscriber, subscriber_email, father_husband_name, dob, gender, address, google_address_location, assigned_doctor, package_id, med_given, photo_path, is_active, visits_json')
      .order('month_id', { ascending: false })
      .order('patient_id');

    if (monthFilter) {
      query = query.eq('month_id', monthFilter);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data || []).map((r) => ({
      ...r,
      is_active: r.is_active ?? true,
    }));

    // Deduplicate: keep only the most recent entry per patient_id (since month_id descending)
    const seen = new Set<number>();
    const unique = rows.filter((row) => {
      const pid = Number(row.patient_id);
      if (seen.has(pid)) return false;
      seen.add(pid);
      return true;
    });

    // Apply filters
    let filtered = unique;
    if (search) {
      filtered = filtered.filter((r) =>
        r.name?.toLowerCase().includes(search) ||
        r.subscriber?.toLowerCase().includes(search) ||
        r.assigned_doctor?.toLowerCase().includes(search) ||
        String(r.patient_id).includes(search)
      );
    }
    if (genderFilter) {
      filtered = filtered.filter((r) => r.gender === genderFilter);
    }
    if (statusFilter === 'active') {
      filtered = filtered.filter((r) => r.is_active !== false);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((r) => r.is_active === false);
    }

    return NextResponse.json({ patients: filtered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
