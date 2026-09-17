import { createClient } from '@libsql/client';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sqlitePath = process.env.LOCAL_DB_PATH || '.data/patient_visits.db';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing.');
}

const sqlite = createClient({ url: `file:${sqlitePath.replaceAll('\\', '/')}` });
const apiUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;

async function readRows(sql) {
  const result = await sqlite.execute(sql);
  return result.rows;
}

async function upsert(table, rows, conflict) {
  if (rows.length === 0) return;

  const response = await fetch(`${apiUrl}/${table}?on_conflict=${conflict}`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: `resolution=merge-duplicates,return=minimal`,
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(`${table} import failed (${response.status}): ${await response.text()}`);
  }
}

const months = (await readRows(`
  select id, year, month, label, days_in_month, created_at
  from months
`)).map((row) => ({
  id: String(row.id),
  year: Number(row.year),
  month: Number(row.month),
  label: String(row.label),
  days_in_month: Number(row.days_in_month),
  created_at: String(row.created_at),
}));

const packages = (await readRows(`
  select id, name, price, doc, nur_phy, nur, phy, psy, med, sort_order
  from packages
`)).map((row) => ({
  id: Number(row.id),
  name: String(row.name),
  price: Number(row.price || 0),
  doc: Number(row.doc || 0),
  nur_phy: Number(row.nur_phy || 0),
  nur: Number(row.nur || 0),
  phy: Number(row.phy || 0),
  psy: Number(row.psy || 0),
  med: Number(row.med || 0),
  sort_order: Number(row.sort_order || 0),
}));

const patients = (await readRows(`
  select month_id, patient_id, name, subscriber, pkg_idx, med_given, visits_json, sort_order
  from month_patients
`)).map((row) => ({
  month_id: String(row.month_id),
  patient_id: Number(row.patient_id),
  name: String(row.name),
  subscriber: String(row.subscriber || ''),
  pkg_idx: Number(row.pkg_idx),
  med_given: Number(row.med_given || 0),
  visits_json: JSON.parse(String(row.visits_json || '[]')),
  sort_order: Number(row.sort_order || 0),
}));

await upsert('months', months, 'id');
await upsert('packages', packages, 'id');
await upsert('month_patients', patients, 'month_id,patient_id');

console.log(`Imported ${months.length} months, ${packages.length} packages, and ${patients.length} patient-month rows.`);
