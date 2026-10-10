import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/reports/income-statement?startDate=...&endDate=...
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || `${new Date().getFullYear()}-01-01`;
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    // Fetch all journal lines within date range
    const { data: entries, error } = await db
      .from('journal_entries')
      .select(`
        id,
        entry_date,
        is_void,
        lines:journal_entry_lines(
          account_id,
          account_code,
          account_name,
          debit_pkr,
          credit_pkr
        )
      `)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .eq('is_void', false);

    if (error) {
      console.warn('Income statement query error:', error.message);
      return NextResponse.json({
        period: { startDate, endDate },
        revenues: [],
        costOfServices: [],
        operatingExpenses: [],
        totalRevenue: 0,
        totalCostOfServices: 0,
        grossProfit: 0,
        totalOperatingExpenses: 0,
        netProfit: 0,
      });
    }

    // Also fetch chart of accounts to know account types and sub_types
    const { data: accounts } = await db.from('accounts').select('code, name, type, sub_type');
    const acctTypeMap = new Map<string, { type: string; sub_type: string; name: string }>();
    (accounts || []).forEach((a) => acctTypeMap.set(a.code, { type: a.type, sub_type: a.sub_type || '', name: a.name }));

    // Aggregate by account code
    const accountBalances = new Map<string, { code: string; name: string; amount: number; sub_type: string }>();

    (entries || []).forEach((e) => {
      (e.lines || []).forEach((l: any) => {
        const info = acctTypeMap.get(l.account_code);
        if (!info) return;

        // Revenue: Net Credit (Credit - Debit)
        // Expense: Net Debit (Debit - Credit)
        let delta = 0;
        if (info.type === 'revenue') {
          delta = (Number(l.credit_pkr) || 0) - (Number(l.debit_pkr) || 0);
        } else if (info.type === 'expense') {
          delta = (Number(l.debit_pkr) || 0) - (Number(l.credit_pkr) || 0);
        }

        if (delta !== 0) {
          const current = accountBalances.get(l.account_code) || {
            code: l.account_code,
            name: info.name,
            amount: 0,
            sub_type: info.sub_type,
          };
          current.amount += delta;
          accountBalances.set(l.account_code, current);
        }
      });
    });

    const revenues: any[] = [];
    const costOfServices: any[] = [];
    const operatingExpenses: any[] = [];

    accountBalances.forEach((item) => {
      const info = acctTypeMap.get(item.code);
      if (info?.type === 'revenue') {
        revenues.push(item);
      } else if (info?.type === 'expense') {
        if (info.sub_type.toLowerCase().includes('cost of service')) {
          costOfServices.push(item);
        } else {
          operatingExpenses.push(item);
        }
      }
    });

    const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
    const totalCostOfServices = costOfServices.reduce((s, c) => s + c.amount, 0);
    const grossProfit = totalRevenue - totalCostOfServices;
    const totalOperatingExpenses = operatingExpenses.reduce((s, o) => s + o.amount, 0);
    const netProfit = grossProfit - totalOperatingExpenses;

    return NextResponse.json({
      period: { startDate, endDate },
      revenues,
      costOfServices,
      operatingExpenses,
      totalRevenue,
      totalCostOfServices,
      grossProfit,
      totalOperatingExpenses,
      netProfit,
    });
  } catch (err: any) {
    console.error('Error generating income statement:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
