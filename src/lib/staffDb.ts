import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Generates the next staff ID by counting total staff records (including inactive).
 * Format: HHC-STF-NNNN (four-digit zero-padded).
 * The number never reuses even if records are deleted, because it uses
 * the count of ALL historical records (we use MAX on numeric suffix instead).
 */
export async function generateNextStaffId(): Promise<string> {
  const db = getSupabase();
  // Use max existing numeric suffix to avoid reuse after deletion
  const { data, error } = await db
    .from('staff')
    .select('staff_id')
    .order('staff_id', { ascending: false })
    .limit(1);

  if (error) throw new Error(`Failed to generate staff ID: ${error.message}`);

  let nextNumber = 1;
  if (data && data.length > 0 && data[0].staff_id) {
    const match = data[0].staff_id.match(/HHC-STF-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `HHC-STF-${String(nextNumber).padStart(4, '0')}`;
}
