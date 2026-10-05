import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Package, PatientMonthData, MonthInfo, DayVisits } from './types';
import { getDaysInMonth, getMonthLabel, getDefaultMonthId } from './calendar';

function normalizeDayVisits(raw: unknown): DayVisits {
  const values = Array.isArray(raw) ? raw.map((value) => typeof value === 'string' ? value : '') : [];
  return [
    values[0] || '',
    values[1] || '',
    values[2] || '',
    values[3] || '',
    values[4] || '',
    values[5] || '',
    values[6] || '',
    values[7] || '',
  ] as DayVisits;
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
  const db = getSupabase();
  let rows: any[] | null = null;
  const query = await db.from('packages').select('id, name, price, doc, nur_phy, nur, phy, psy, med, sv, flu, opd').order('sort_order').order('id');
  if (query.error) {
    // Fallback if sv, flu, opd columns do not exist on database yet
    const fallback = await db.from('packages').select('id, name, price, doc, nur_phy, nur, phy, psy, med').order('sort_order').order('id');
    throwIfError(fallback.error);
    rows = fallback.data;
  } else {
    rows = query.data;
  }
  return (rows || []).map((row: any) => ({
    id: Number(row.id),
    name: String(row.name),
    price: Number(row.price || 0),
    doc: Number(row.doc || 0),
    nurPhy: Number(row.nur_phy || 0),
    nur: Number(row.nur || 0),
    phy: Number(row.phy || 0),
    psy: Number(row.psy || 0),
    med: Number(row.med || 0),
    sv: Number(row.sv || 0),
    flu: Number(row.flu || 0),
    opd: Number(row.opd || 0),
  }));
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
  
  // Try upserting with sv, flu, opd first
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
    sv: pkg.sv || 0,
    flu: pkg.flu || 0,
    opd: pkg.opd || 0,
    sort_order: index,
  })), { onConflict: 'id' });

  if (error) {
    // If sv, flu, opd columns don't exist yet on DB, fallback without them
    const fallback = await db.from('packages').upsert(packages.map((pkg, index) => ({
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
    throwIfError(fallback.error);
  }
}

export async function getMonthPatients(monthId: string): Promise<PatientMonthData[]> {
  const db = getSupabase();
  const month = await getMonth(monthId);
  const daysInMonth = month?.daysInMonth || 30;

  let rows: any[] | null = null;
  const extendedQuery = await db.from('month_patients')
    .select('patient_id, name, subscriber, subscriber_email, father_husband_name, dob, gender, address, google_address_location, assigned_doctor, package_id, med_given, visits_json, photo_path')
    .eq('month_id', monthId)
    .order('sort_order')
    .order('patient_id');

  if (extendedQuery.error) {
    const fallbackQuery = await db.from('month_patients')
      .select('patient_id, name, subscriber, package_id, med_given, visits_json')
      .eq('month_id', monthId)
      .order('sort_order')
      .order('patient_id');
    throwIfError(fallbackQuery.error);
    rows = fallbackQuery.data;
  } else {
    rows = extendedQuery.data;
  }

  return (rows || []).map((row) => ({
    id: Number(row.patient_id),
    name: String(row.name || ''),
    subscriber: String(row.subscriber || ''),
    subscriberEmail: String(row.subscriber_email || ''),
    fatherHusbandName: String(row.father_husband_name || ''),
    dob: String(row.dob || ''),
    gender: String(row.gender || ''),
    address: String(row.address || ''),
    googleAddressLocation: String(row.google_address_location || ''),
    assignedDoctor: String(row.assigned_doctor || ''),
    packageId: row.package_id === null ? null : Number(row.package_id),
    medGiven: Number(row.med_given || 0),
    photo_path: row.photo_path || null,
    v: normalizeVisits(row.visits_json, daysInMonth),
  }));
}

export async function updatePatient(monthId: string, patientId: number, data: Partial<PatientMonthData>) {
  const db = getSupabase();
  const current = await db.from('month_patients').select('*').eq('month_id', monthId).eq('patient_id', patientId).maybeSingle();
  throwIfError(current.error);
  if (!current.data) return;

  const payload: Record<string, any> = {
    name: data.name ?? current.data.name,
    subscriber: data.subscriber ?? current.data.subscriber,
    package_id: 'packageId' in data ? data.packageId : current.data.package_id,
    med_given: data.medGiven ?? current.data.med_given,
    visits_json: data.v ?? current.data.visits_json,
  };

  if ('subscriberEmail' in data) payload.subscriber_email = data.subscriberEmail ?? '';
  if ('fatherHusbandName' in data) payload.father_husband_name = data.fatherHusbandName ?? '';
  if ('dob' in data) payload.dob = data.dob ?? '';
  if ('gender' in data) payload.gender = data.gender ?? '';
  if ('address' in data) payload.address = data.address ?? '';
  if ('googleAddressLocation' in data) payload.google_address_location = data.googleAddressLocation ?? '';
  if ('assignedDoctor' in data) payload.assigned_doctor = data.assignedDoctor ?? '';
  if ('photo_path' in data) payload.photo_path = data.photo_path ?? null;

  const { error } = await db.from('month_patients').update(payload).eq('month_id', monthId).eq('patient_id', patientId);
  if (error) {
    // Fallback if extended columns do not exist yet on DB
    delete payload.subscriber_email;
    delete payload.father_husband_name;
    delete payload.dob;
    delete payload.gender;
    delete payload.address;
    delete payload.google_address_location;
    delete payload.assigned_doctor;
    const fallback = await db.from('month_patients').update(payload).eq('month_id', monthId).eq('patient_id', patientId);
    throwIfError(fallback.error);
  }
}

export async function addPatient(
  monthId: string,
  name: string,
  subscriber: string,
  packageId: number | null,
  extra?: {
    subscriberEmail?: string;
    fatherHusbandName?: string;
    dob?: string;
    gender?: string;
    address?: string;
    googleAddressLocation?: string;
    assignedDoctor?: string;
  }
): Promise<PatientMonthData> {
  const db = getSupabase();
  const month = await getMonth(monthId);
  const { data: maxData } = await db.from('month_patients')
    .select('patient_id')
    .eq('month_id', monthId)
    .order('patient_id', { ascending: false })
    .limit(1);

  const id = maxData && maxData.length > 0 ? Number(maxData[0].patient_id) + 1 : 1;
  const visits = Array.from({ length: month?.daysInMonth || 30 }, () => ['', '', '', '', '', '', '', '']);

  const payload: Record<string, any> = {
    month_id: monthId,
    patient_id: id,
    name,
    subscriber,
    package_id: packageId,
    med_given: 0,
    visits_json: visits,
    sort_order: id - 1,
    subscriber_email: extra?.subscriberEmail || '',
    father_husband_name: extra?.fatherHusbandName || '',
    dob: extra?.dob || '',
    gender: extra?.gender || '',
    address: extra?.address || '',
    google_address_location: extra?.googleAddressLocation || '',
    assigned_doctor: extra?.assignedDoctor || '',
  };

  const { error } = await db.from('month_patients').insert(payload);
  if (error) {
    // Fallback without extended fields
    delete payload.subscriber_email;
    delete payload.father_husband_name;
    delete payload.dob;
    delete payload.gender;
    delete payload.address;
    delete payload.google_address_location;
    delete payload.assigned_doctor;
    const fallback = await db.from('month_patients').insert(payload);
    throwIfError(fallback.error);
  }

  return {
    id,
    name,
    subscriber,
    subscriberEmail: extra?.subscriberEmail || '',
    fatherHusbandName: extra?.fatherHusbandName || '',
    dob: extra?.dob || '',
    gender: extra?.gender || '',
    address: extra?.address || '',
    googleAddressLocation: extra?.googleAddressLocation || '',
    assignedDoctor: extra?.assignedDoctor || '',
    packageId,
    medGiven: 0,
    v: visits as DayVisits[],
  };
}

export async function deletePatient(monthId: string, patientId: number) {
  const { error } = await getSupabase().from('month_patients').delete().eq('month_id', monthId).eq('patient_id', patientId);
  throwIfError(error);
}

export async function resetMonth(monthId: string) {
  const month = await getMonth(monthId);
  const visits = Array.from({ length: month?.daysInMonth || 30 }, () => ['', '', '', '', '', '', '', '']);
  const { error } = await getSupabase().from('month_patients').update({ package_id: null, med_given: 0, visits_json: visits }).eq('month_id', monthId);
  throwIfError(error);
}

export async function copyPatientsToMonth(fromMonthId: string, toMonthId: string): Promise<number> {
  const toMonth = await getMonth(toMonthId);
  if (!toMonth) throw new Error(`Target month ${toMonthId} not found`);
  const previous = await getMonthPatients(fromMonthId);
  if (!previous.length) return 0;

  const db = getSupabase();
  const { error: deleteError } = await db.from('month_patients').delete().eq('month_id', toMonthId);
  throwIfError(deleteError);

  const visits = Array.from({ length: toMonth.daysInMonth }, () => ['', '', '', '', '', '', '', '']);
  const insertPayload = previous.map((patient, index) => ({
    month_id: toMonthId,
    patient_id: patient.id,
    name: patient.name,
    subscriber: patient.subscriber,
    subscriber_email: patient.subscriberEmail || '',
    father_husband_name: patient.fatherHusbandName || '',
    dob: patient.dob || '',
    gender: patient.gender || '',
    address: patient.address || '',
    google_address_location: patient.googleAddressLocation || '',
    assigned_doctor: patient.assignedDoctor || '',
    package_id: patient.packageId,
    med_given: 0,
    visits_json: visits,
    sort_order: index,
  }));

  const { error: insertError } = await db.from('month_patients').insert(insertPayload);
  if (insertError) {
    const fallbackPayload = previous.map((patient, index) => ({
      month_id: toMonthId,
      patient_id: patient.id,
      name: patient.name,
      subscriber: patient.subscriber,
      package_id: patient.packageId,
      med_given: 0,
      visits_json: visits,
      sort_order: index,
    }));
    const fallback = await db.from('month_patients').insert(fallbackPayload);
    throwIfError(fallback.error);
  }
  return previous.length;
}

export async function createMonth(year: number, month: number, carryOverPatientsFromMonthId?: string): Promise<MonthInfo> {
  const monthId = `${year}-${month.toString().padStart(2, '0')}`;
  const existing = await getMonth(monthId);
  const daysInMonth = getDaysInMonth(year, month);
  const label = getMonthLabel(year, month);

  if (!existing) {
    const { error } = await getSupabase().from('months').insert({ id: monthId, year, month, label, days_in_month: daysInMonth });
    throwIfError(error);
  }

  if (carryOverPatientsFromMonthId) {
    const currentPatients = await getMonthPatients(monthId);
    if (currentPatients.length === 0) {
      await copyPatientsToMonth(carryOverPatientsFromMonthId, monthId);
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
    const insertPayload = data.patients.map((patient: any, index: number) => ({
      month_id: monthId,
      patient_id: patient.id || index + 1,
      name: String(patient.name || '').trim(),
      subscriber: patient.subscriber || '',
      subscriber_email: patient.subscriberEmail || patient.subscriber_email || '',
      father_husband_name: patient.fatherHusbandName || patient.father_husband_name || '',
      dob: patient.dob || '',
      gender: patient.gender || '',
      address: patient.address || '',
      google_address_location: patient.googleAddressLocation || patient.google_address_location || '',
      assigned_doctor: patient.assignedDoctor || patient.assigned_doctor || '',
      package_id: typeof patient.packageId === 'number'
        ? patient.packageId
        : typeof patient.pkgIdx === 'number' && importedPackages[patient.pkgIdx]
          ? importedPackages[patient.pkgIdx].id
          : null,
      med_given: Math.max(0, Number(patient.medGiven) || 0),
      visits_json: normalizeVisits(patient.v, daysInMonth),
      sort_order: index,
    }));

    const { error: insertError } = await db.from('month_patients').insert(insertPayload);
    if (insertError) {
      const fallbackPayload = data.patients.map((patient: any, index: number) => ({
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
      }));
      const fallback = await db.from('month_patients').insert(fallbackPayload);
      throwIfError(fallback.error);
    }
  }
}
