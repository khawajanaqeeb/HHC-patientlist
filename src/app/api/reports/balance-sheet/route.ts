import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/reports/balance-sheet?asOfDate=...
export async function GET(request: NextRequest) {
  try {
    const db = getSupabase();
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0];

    // 1. Fetch all journal entries up to asOfDate
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
      .lte('entry_date', asOfDate)
      .eq('is_void', false);

    if (error) {
      console.warn('Balance sheet query error:', error.message);
      return NextResponse.json({
        asOfDate,
        assets: [],
        liabilities: [],
        equity: [],
        currentPeriodProfit: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        isBalanced: true,
      });
    }

    // 2. Fetch Chart of Accounts
    const { data: accounts } = await db.from('accounts').select('code, name, type, sub_type');
    const acctTypeMap = new Map<string, { type: string; sub_type: string; name: string }>();
    (accounts || []).forEach((a) => acctTypeMap.set(a.code, { type: a.type, sub_type: a.sub_type || '', name: a.name }));

    // 3. Calculate Account Net Balances
    const rawBalances = new Map<string, { code: string; name: string; amount: number; sub_type: string; type: string }>();

    let cumulativeRevenue = 0;
    let cumulativeExpense = 0;

    (entries || []).forEach((e) => {
      (e.lines || []).forEach((l: any) => {
        const info = acctTypeMap.get(l.account_code);
        if (!info) return;

        const debit = Number(l.debit_pkr) || 0;
        const credit = Number(l.credit_pkr) || 0;

        if (info.type === 'asset') {
          // Assets have debit normal balance (1420 contra-asset subtracts)
          const net = l.account_code === '1420' ? -(credit - debit) : (debit - credit);
          const current = rawBalances.get(l.account_code) || {
            code: l.account_code,
            name: info.name,
            amount: 0,
            sub_type: info.sub_type,
            type: info.type,
          };
          current.amount += net;
          rawBalances.set(l.account_code, current);
        } else if (info.type === 'liability' || info.type === 'equity') {
          // Liabilities & Equity have credit normal balance (3030 drawings subtracts)
          const net = l.account_code === '3030' ? -(debit - credit) : (credit - debit);
          const current = rawBalances.get(l.account_code) || {
            code: l.account_code,
            name: info.name,
            amount: 0,
            sub_type: info.sub_type,
            type: info.type,
          };
          current.amount += net;
          rawBalances.set(l.account_code, current);
        } else if (info.type === 'revenue') {
          cumulativeRevenue += (credit - debit);
        } else if (info.type === 'expense') {
          cumulativeExpense += (debit - credit);
        }
      });
    });

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];

    rawBalances.forEach((item) => {
      if (item.type === 'asset' && item.amount !== 0) assets.push(item);
      if (item.type === 'liability' && item.amount !== 0) liabilities.push(item);
      if (item.type === 'equity' && item.amount !== 0) equity.push(item);
    });

    const currentPeriodProfit = cumulativeRevenue - cumulativeExpense;

    const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);
    const totalOwnerEquity = equity.reduce((s, e) => s + e.amount, 0);
    const totalEquity = totalOwnerEquity + currentPeriodProfit;

    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.05;

    return NextResponse.json({
      asOfDate,
      assets,
      liabilities,
      equity,
      currentPeriodProfit,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced,
    });
  } catch (err: any) {
    console.error('Error generating balance sheet:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
