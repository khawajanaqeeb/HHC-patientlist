import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/accounts — fetch all accounts
export async function GET() {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('accounts')
      .select('id, code, name, type, sub_type, description, is_active, created_at')
      .order('code');
    if (error) throw error;
    return NextResponse.json({ accounts: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/accounts — create a new account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, type, sub_type, description } = body;

    if (!code || !name || !type) {
      return NextResponse.json({ error: 'code, name, and type are required' }, { status: 400 });
    }

    const db = getSupabase();
    const { data, error } = await db
      .from('accounts')
      .insert({ code: code.trim(), name: name.trim(), type, sub_type: sub_type || null, description: description || null })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ account: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
