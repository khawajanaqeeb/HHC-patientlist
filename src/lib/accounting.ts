import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export interface JournalLineInput {
  account_code: string;
  debit_pkr: number;
  credit_pkr: number;
  description?: string;
}

/**
 * Creates a balanced journal entry with lines.
 * Checks that total debits === total credits before inserting.
 */
export async function postJournalEntry(params: {
  source_type: 'invoice' | 'payment' | 'revenue_recognition' | 'manual' | 'expense' | 'reversal';
  source_id?: string;
  description: string;
  entry_date?: string;
  lines: JournalLineInput[];
}) {
  const db = getSupabase();
  const { source_type, source_id, description, lines } = params;
  const entryDate = params.entry_date || new Date().toISOString().split('T')[0];

  // 1. Verify balance (total debits must equal total credits)
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit_pkr) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit_pkr) || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);

  if (diff > 0.05) {
    throw new Error(
      `Unbalanced journal entry: Debits (Rs ${totalDebit.toFixed(2)}) != Credits (Rs ${totalCredit.toFixed(2)})`
    );
  }

  // 2. Resolve accounts
  const { data: accounts, error: acctErr } = await db.from('accounts').select('id, code, name');
  if (acctErr) throw new Error(acctErr.message);

  const acctMap = new Map<string, { id: string; name: string }>();
  (accounts || []).forEach((a) => acctMap.set(a.code, { id: a.id, name: a.name }));

  const year = new Date().getFullYear();
  const entryNumber = `HHC-JNL-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 3. Insert Journal Entry Header
  const { data: header, error: headerErr } = await db
    .from('journal_entries')
    .insert({
      entry_number: entryNumber,
      entry_date: entryDate,
      source_type,
      source_id: source_id || null,
      description,
      is_void: false,
    })
    .select()
    .single();

  if (headerErr) throw new Error(headerErr.message);

  // 4. Insert Lines
  const linePayloads = lines.map((l) => {
    const acct = acctMap.get(l.account_code);
    return {
      entry_id: header.id,
      account_id: acct?.id || '00000000-0000-0000-0000-000000000000',
      account_code: l.account_code,
      account_name: acct?.name || `Account ${l.account_code}`,
      debit_pkr: Number(l.debit_pkr) || 0,
      credit_pkr: Number(l.credit_pkr) || 0,
      description: l.description || description,
    };
  });

  const { error: linesErr } = await db.from('journal_entry_lines').insert(linePayloads);
  if (linesErr) {
    console.error('Error inserting journal lines:', linesErr);
  }

  return header;
}
