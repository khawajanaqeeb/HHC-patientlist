import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateNextStaffId } from '@/lib/staffDb';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const designation = url.searchParams.get('designation') || '';
    const gender = url.searchParams.get('gender') || '';
    const status = url.searchParams.get('status') || '';

    let query = db.from('staff').select('*').order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,staff_id.ilike.%${search}%,contact_number.ilike.%${search}%,designation_type.ilike.%${search}%,designation_custom.ilike.%${search}%`
      );
    }
    if (designation) query = query.eq('designation_type', designation);
    if (gender) query = query.eq('gender', gender);
    if (status === 'active') query = query.eq('is_active', true);
    else if (status === 'inactive') query = query.eq('is_active', false);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ staff: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getSupabase();

    const staffId = await generateNextStaffId();
    const payload = {
      staff_id: staffId,
      name: String(body.name || '').trim(),
      father_husband_name: String(body.father_husband_name || '').trim(),
      gender: body.gender,
      designation_type: body.designation_type,
      designation_custom: body.designation_type === 'other' ? (body.designation_custom || null) : null,
      address: body.address || null,
      contact_number: String(body.contact_number || '').trim(),
      email: body.email || null,
      whatsapp: body.whatsapp || null,
      google_maps_url: body.google_maps_url || null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      qualification: body.qualification || null,
      photo_path: body.photo_path || null,
      is_active: true,
    };

    if (!payload.name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    if (!payload.contact_number) return NextResponse.json({ error: 'Contact number is required.' }, { status: 400 });
    if (!payload.gender) return NextResponse.json({ error: 'Gender is required.' }, { status: 400 });
    if (!payload.designation_type) return NextResponse.json({ error: 'Designation is required.' }, { status: 400 });
    if (!payload.father_husband_name) return NextResponse.json({ error: "Father's/Husband's name is required." }, { status: 400 });

    const { data, error } = await db.from('staff').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ staff: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
