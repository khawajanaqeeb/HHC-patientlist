import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Package, PatientMonthData, MonthInfo, DayVisits } from './types';
import { getDaysInMonth, getMonthLabel, getDefaultMonthId } from './calendar';

function normalizeDayVisits(raw: unknown): DayVisits {
  const values = Array.isArray(raw) ? raw.map((value) => typeof value === 'string' ? value : '') : [];
  if (values.length >= 5) return [values[0], values[1], values[2], values[3], values[4]] as DayVisits;
  return [values[0] || '', values[1] || '', '', values[2] || '', values[3] || ''] as DayVisits;
}

function normalizeVisits(raw: unknown, daysInMonth: number): DayVisits[] {
  const values = Array.isArray(raw) ? raw : [];
  return Array.from({ length: daysInMonth }, (_, index) => normalizeDayVisits(values[index]));
}

let client: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
  client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function ensureDbInitialized() {
  getSupabase();
}

export async function getAllMonths(): Promise<MonthInfo[]> {
  const { data, error } = await getSupabase().from('months').select('id, year, month, label, days_in_month').order('id');
  throwIfError(error);
  return (data || []).map((row) => ({ id: String(row.id), year: Number(row.year), month: Number(row.month), label: String(row.label), daysInMonth: Number(row.days_in_month) }));
}

export async function getMonth(monthId: string): Promise<MonthInfo | null> {
  const { data, error } = await getSupabase().from('months').select('id, year, month, label, days_in_month').eq('id', monthId).maybeSingle();
  throwIfError(error);
  if (!data) return null;
  return { id: String(data.id), year: Number(data.year), month: Number(data.month), label: String(data.label), daysInMonth: Number(data.days_in_month) };
}

export async function getPackages(): Promise<Package[]> {
  const { data, error } = await getSupabase().from('packages').select('id, name, price, doc, nur_phy, nur, phy, psy, med').order('sort_order').order('id');
  throwIfError(error);
  return (data || []).map((row) => ({ id: Number(row.id), name: String(row.name), price: Number(row.price || 0), doc: Number(row.doc || 0), nurPhy: Number(row.nur_phy || 0), nur: Number(row.nur || 0), phy: Number(row.phy || 0), psy: Number(row.psy || 0), med: Number(row.med || 0) }));
}

export async function savePackages(packages: Package[]) {
  const db = getSupabase();
  const existing = await db.from('packages').select('id');
  throwIfError(existing.error);
  const retainedIds = new Set(packages.map((pkg) => pkg.id).filter((id) => id > 0));
  const removedIds = (existing.data || []).map((row) => Number(row.id)).filter((id) => !retainedIds.has(id));

  if (removedIds.length) {
    const { error: patientError } = await db.from('month_patients').update({ package_id: null }).in('package_id', removedIds);
    throwIfError(patientError);
    const { error: deleteError } = await db.from('packages').delete().in('id', removedIds);
    throwIfError(deleteError);
  }

  if (!packages.length) return;
  const { error } = await db.from('packages').upsert(packages.map((pkg, index) => ({
    id: pkg.id,
    name: pkg.name.trim(),
    price: pkg.price || 0,
    doc: pkg.doc || 0,
    nur_phy: pkg.nurPhy || 0,
    nur: pkg.nur || 0,
    phy: pkg.phy || 0,
    psy: pkg.psy || 0,
    med: pkg.med || 0,
    sort_order: index,
  })), { onConflict: 'id' });
  throwIfError(error);
}

export async function getMonthPatients(monthId: string): Promise<PatientMonthData[]> {
  const month = await getMonth(monthId);
  const { data, error } = await getSupabase().from('month_patients').select('patient_id, name, subscriber, package_id, med_given, visits_json').eq('month_id', monthId).order('sort_order').order('patient_id');
  throwIfError(error);
  const daysInMonth = month?.daysInMonth || 30;
  return (data || []).map((row) => ({ id: Number(row.patient_id), name: String(row.name), subscriber: String(row.subscriber || ''), packageId: row.package_id === null ? null : Number(row.package_id), medGiven: Number(row.med_given || 0), v: normalizeVisits(row.visits_json, daysInMonth) }));
}

export async function updatePatient(monthId: string, patientId: number, data: Partial<PatientMonthData>) {
  const db = getSupabase();
  const current = await db.from('month_patients').select('*').eq('month_id', monthId).eq('patient_id', patientId).maybeSingle();
  throwIfError(current.error);
  if (!current.data) return;
  const { error } = await db.from('month_patients').update({
    name: data.name ?? current.data.name,
    subscriber: data.subscriber ?? current.data.subscriber,
    package_id: 'packageId' in data ? data.packageId : current.data.package_id,
    med_given: data.medGiven ?? current.data.med_given,
    visits_json: data.v ?? current.data.visits_json,
  }).eq('month_id', monthId).eq('patient_id', patientId);
  throwIfError(error);
}

export async function addPatient(monthId: string, name: string, subscriber: string, packageId: number | null): Promise<PatientMonthData> {
  const db = getSupabase();
  const month = await getMonth(monthId);
  const { data: maxData } = await db.from('month_patients')
    .select('patient_id')
    .eq('month_id', monthId)
    .order('patient_id', { ascending: false })
    .limit(1);

  const id = maxData && maxData.length > 0 ? Number(maxData[0].patient_id) + 1 : 1;
  const visits = Array.from({ length: month?.daysInMonth || 30 }, () => ['', '', '', '', '']);
  const { error } = await db.from('month_patients').insert({
    month_id: monthId,
    patient_id: id,
    name,
    subscriber,
    package_id: packageId,
    med_given: 0,
    visits_json: visits,
    sort_order: id - 1,
  });
  throwIfError(error);
  return { id, name, subscriber, packageId, medGiven: 0, v: visits as DayVisits[] };
}

export async function deletePatient(monthId: string, patientId: number) {
  const { error } = await getSupabase().from('month_patients').delete().eq('month_id', monthId).eq('patient_id', patientId);
  throwIfError(error);
}

export async function resetMonth(monthId: string) {
  const month = await getMonth(monthId);
  const visits = Array.from({ length: month?.daysInMonth || 30 }, () => ['', '', '', '', '']);
  const { error } = await getSupabase().from('month_patients').update({ package_id: null, med_given: 0, visits_json: visits }).eq('month_id', monthId);
  throwIfError(error);
}

export async function createMonth(year: number, month: number, carryOverPatientsFromMonthId?: string): Promise<MonthInfo> {
  const monthId = `${year}-${month.toString().padStart(2, '0')}`;
  const existing = await getMonth(monthId);
  if (existing) return existing;
  const daysInMonth = getDaysInMonth(year, month);
  const label = getMonthLabel(year, month);
  const { error } = await getSupabase().from('months').insert({ id: monthId, year, month, label, days_in_month: daysInMonth });
  throwIfError(error);
  if (carryOverPatientsFromMonthId) {
    const previous = await getMonthPatients(carryOverPatientsFromMonthId);
    const visits = Array.from({ length: daysInMonth }, () => ['', '', '', '', '']);
    if (previous.length) {
      const { error: patientError } = await getSupabase().from('month_patients').insert(previous.map((patient, index) => ({ month_id: monthId, patient_id: patient.id, name: patient.name, subscriber: patient.subscriber, package_id: patient.packageId, med_given: 0, visits_json: visits, sort_order: index })));
      throwIfError(patientError);
    }
  }
  return { id: monthId, year, month, label, daysInMonth };
}

export async function importFullJson(data: any, targetMonthId?: string) {
  const monthId = targetMonthId || getDefaultMonthId();
  const db = getSupabase();
  const month = await getMonth(monthId);
  const daysInMonth = month?.daysInMonth || 30;
  if (Array.isArray(data.PKGS)) {
    const { error } = await db.from('packages').delete().gte('id', 0);
    throwIfError(error);
    const { error: insertError } = await db.from('packages').insert(data.PKGS.map((pkg: any, index: number) => ({ name: pkg.name, price: pkg.price || 0, doc: pkg.doc || 0, nur_phy: pkg.nurPhy ?? pkg.nur_phy ?? pkg.nur ?? 0, nur: pkg.nur ?? pkg.nur_only ?? 0, phy: pkg.phy || 0, psy: pkg.psy || 0, med: pkg.med || 0, sort_order: index })));
    throwIfError(insertError);
  }
  if (Array.isArray(data.patients)) {
    const { error } = await db.from('month_patients').delete().eq('month_id', monthId);
    throwIfError(error);
    const importedPackages = await getPackages();
    const { error: insertError } = await db.from('month_patients').insert(data.patients.map((patient: any, index: number) => ({
      month_id: monthId,
      patient_id: patient.id || index + 1,
      name: String(patient.name || '').trim(),
      subscriber: patient.subscriber || '',
      package_id: typeof patient.packageId === 'number'
        ? patient.packageId
        : typeof patient.pkgIdx === 'number' && importedPackages[patient.pkgIdx]
          ? importedPackages[patient.pkgIdx].id
          : null,
      med_given: Math.max(0, Number(patient.medGiven) || 0),
      visits_json: normalizeVisits(patient.v, daysInMonth),
      sort_order: index,
    })));
    throwIfError(insertError);
  }
}
