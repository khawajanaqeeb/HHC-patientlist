import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postJournalEntry, JournalLineInput } from '@/lib/accounting';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/journal?sourceType=...&startDate=...&endDate=...&search=...
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const sourceType = searchParams.get('sourceType')?.trim() || '';

    let query = db
      .from('journal_entries')
      .select(`
        *,
        lines:journal_entry_lines(*)
      `)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (sourceType && sourceType !== 'all') {
      query = query.eq('source_type', sourceType);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Journal entries query error or table not yet migrated:', error.message);
      return NextResponse.json({ entries: [] });
    }

    let list = data || [];
    if (search) {
      list = list.filter((e: any) =>
        e.entry_number?.toLowerCase().includes(search) ||
        e.description?.toLowerCase().includes(search) ||
        e.lines?.some((l: any) =>
          l.account_code?.toLowerCase().includes(search) ||
          l.account_name?.toLowerCase().includes(search)
        )
      );
    }

    return NextResponse.json({ entries: list });
  } catch (err: any) {
    console.error('Error fetching journal entries:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/journal — Manual journal entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entry_date, description, lines } = body;

    if (!description?.trim() || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json(
        { error: 'Description and at least two journal lines are required' },
        { status: 400 }
      );
    }

    const header = await postJournalEntry({
      source_type: 'manual',
      description: description.trim(),
      entry_date,
      lines: lines as JournalLineInput[],
    });

    return NextResponse.json({ success: true, entry: header }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating journal entry:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
