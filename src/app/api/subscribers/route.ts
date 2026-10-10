import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/subscribers?search=...
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    let query = db
      .from('subscribers')
      .select('id, name, email, phone, address, notes, created_at')
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      // Fallback: extract distinct subscribers from month_patients if subscribers table is not migrated yet
      const fallbackQuery = await db.from('month_patients').select('subscriber, subscriber_email');
      if (fallbackQuery.error) throw new Error(error.message);
      
      const distinctMap = new Map<string, { id: string; name: string; email: string }>();
      (fallbackQuery.data || []).forEach((row) => {
        const name = (row.subscriber || '').trim();
        if (name && !distinctMap.has(name.toLowerCase())) {
          distinctMap.set(name.toLowerCase(), {
            id: name,
            name,
            email: (row.subscriber_email || '').trim(),
          });
        }
      });
      return NextResponse.json({ subscribers: Array.from(distinctMap.values()) });
    }

    return NextResponse.json({ subscribers: data || [] });
  } catch (err: any) {
    console.error('Error fetching subscribers:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/subscribers
export async function POST(request: NextRequest) {
  try {
    const db = getSupabase();
    const body = await request.json();
    const { name, email, phone, address, notes } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Subscriber name is required' }, { status: 400 });
    }

    const payload = {
      name: name.trim(),
      email: email ? String(email).trim() : null,
      phone: phone ? String(phone).trim() : null,
      address: address ? String(address).trim() : null,
      notes: notes ? String(notes).trim() : null,
    };

    const { data, error } = await db.from('subscribers').insert(payload).select().single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, subscriber: data });
  } catch (err: any) {
    console.error('Error creating subscriber:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
