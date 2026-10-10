import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postJournalEntry } from '@/lib/accounting';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/revenue-recognition
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('revenue_recognitions')
      .select(`
        *,
        subscription:subscriptions(
          id,
          subscription_code,
          plan_name,
          subscriber:subscribers(id, name),
          patient:patients(id, patient_code, name)
        )
      `)
      .order('recognition_date', { ascending: false });

    if (error) {
      console.warn('Revenue recognition query error or table not yet migrated:', error.message);
      return NextResponse.json({ records: [] });
    }

    return NextResponse.json({ records: data || [] });
  } catch (err: any) {
    console.error('Error fetching revenue recognitions:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/revenue-recognition — Trigger recognition run for a period month (e.g. '2026-10')
export async function POST(request: NextRequest) {
  try {
    const db = getSupabase();
    const body = await request.json();
    const currentMonthStr = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const period_month = body.period_month || currentMonthStr;

    // 1. Fetch active subscriptions eligible for recognition
    const { data: subs, error: subErr } = await db
      .from('subscriptions')
      .select('id, subscription_code, plan_id, plan_name, price_pkr, total_recognized_pkr, status, start_date, end_date')
      .eq('status', 'active');

    if (subErr) throw new Error(subErr.message);

    // 2. Fetch existing recognitions for this period to avoid double recognition
    const { data: existingRecs } = await db
      .from('revenue_recognitions')
      .select('subscription_id')
      .eq('period_month', period_month);

    const alreadyRecognized = new Set((existingRecs || []).map((r) => r.subscription_id));

    // 3. Fetch plans and accounts to get target revenue account codes
    const [{ data: plansData }, { data: accountsData }] = await Promise.all([
      db.from('plans').select('id, revenue_account_id'),
      db.from('accounts').select('id, code'),
    ]);

    const acctCodeById = new Map<string, string>();
    (accountsData || []).forEach((a) => acctCodeById.set(a.id, a.code));

    const planRevAccount = new Map<number, string>();
    (plansData || []).forEach((p) => {
      if (p.revenue_account_id && acctCodeById.has(p.revenue_account_id)) {
        planRevAccount.set(p.id, acctCodeById.get(p.revenue_account_id)!);
      } else {
        planRevAccount.set(p.id, '4010'); // Default: Subscription Revenue Basic
      }
    });

    let recognizedCount = 0;
    let totalRecognizedPkr = 0;

    for (const sub of subs || []) {
      if (alreadyRecognized.has(sub.id)) continue;

      const monthlyAmount = Number(sub.price_pkr) || 0;
      if (monthlyAmount <= 0) continue;

      const targetRevAccountCode = planRevAccount.get(sub.plan_id) || '4010';

      // Auto-post double entry: Debit 2050 (Unearned Rev), Credit Target Rev Account
      let jnlHeader: any = null;
      try {
        jnlHeader = await postJournalEntry({
          source_type: 'revenue_recognition',
          source_id: sub.id,
          description: `Revenue Recognized for ${sub.subscription_code} (${period_month})`,
          lines: [
            {
              account_code: '2050',
              debit_pkr: monthlyAmount,
              credit_pkr: 0,
              description: `Unearned Revenue Relieved — ${sub.subscription_code}`,
            },
            {
              account_code: targetRevAccountCode,
              debit_pkr: 0,
              credit_pkr: monthlyAmount,
              description: `Subscription Revenue Recognized — ${sub.subscription_code}`,
            },
          ],
        });
      } catch (postErr: any) {
        console.warn('Journal post warning for rev rec:', postErr.message);
      }

      // Record recognition
      await db.from('revenue_recognitions').insert({
        subscription_id: sub.id,
        period_month,
        amount_pkr: monthlyAmount,
        journal_entry_id: jnlHeader?.id || null,
        notes: `Automated recognition run for period ${period_month}`,
      });

      // Update total_recognized_pkr on subscription
      const newTotal = (Number(sub.total_recognized_pkr) || 0) + monthlyAmount;
      await db
        .from('subscriptions')
        .update({ total_recognized_pkr: newTotal, updated_at: new Date().toISOString() })
        .eq('id', sub.id);

      recognizedCount++;
      totalRecognizedPkr += monthlyAmount;
    }

    return NextResponse.json({
      success: true,
      period_month,
      recognized_count: recognizedCount,
      total_recognized_pkr: totalRecognizedPkr,
    });
  } catch (err: any) {
    console.error('Error running revenue recognition:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
