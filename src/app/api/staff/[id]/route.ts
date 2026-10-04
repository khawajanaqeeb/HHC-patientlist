import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getSupabase();
    const { data, error } = await db.from('staff').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: 'Staff not found.' }, { status: 404 });
    return NextResponse.json({ staff: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getSupabase();

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.father_husband_name !== undefined) update.father_husband_name = String(body.father_husband_name).trim();
    if (body.gender !== undefined) update.gender = body.gender;
    if (body.designation_type !== undefined) {
      update.designation_type = body.designation_type;
      update.designation_custom = body.designation_type === 'other' ? (body.designation_custom || null) : null;
    }
    if (body.address !== undefined) update.address = body.address || null;
    if (body.contact_number !== undefined) update.contact_number = String(body.contact_number).trim();
    if (body.email !== undefined) update.email = body.email || null;
    if (body.whatsapp !== undefined) update.whatsapp = body.whatsapp || null;
    if (body.google_maps_url !== undefined) update.google_maps_url = body.google_maps_url || null;
    if (body.latitude !== undefined) update.latitude = body.latitude ?? null;
    if (body.longitude !== undefined) update.longitude = body.longitude ?? null;
    if (body.qualification !== undefined) update.qualification = body.qualification || null;
    if ('photo_path' in body) update.photo_path = body.photo_path ?? null;
    if (body.is_active !== undefined) update.is_active = body.is_active;

    const { data, error } = await db.from('staff').update(update).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ staff: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
