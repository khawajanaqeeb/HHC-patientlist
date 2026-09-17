import { createClient, Client, InStatement } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { Package, PatientMonthData, MonthInfo, DayVisits } from './types';
import { getDaysInMonth, getMonthLabel } from './calendar';

function normalizeDayVisits(raw: unknown): DayVisits {
  const values = Array.isArray(raw) ? raw : [];
  if (values.length >= 5) return [values[0], values[1], values[2], values[3], values[4]] as DayVisits;
  return [values[0] || '', values[1] || '', '', values[2] || '', values[3] || ''] as DayVisits;
}

function normalizeVisits(raw: unknown, daysInMonth: number): DayVisits[] {
  const values = Array.isArray(raw) ? raw : [];
  return Array.from({ length: daysInMonth }, (_, index) => normalizeDayVisits(values[index]));
}

const DB_DIR = path.join(process.cwd(), '.data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'patient_visits.db');

let _client: Client | null = null;
let _initPromise: Promise<void> | null = null;

export function getClient(): Client {
  if (!_client) {
    const fileUrl = 'file:' + DB_PATH.replace(/\\/g, '/');
    _client = createClient({
      url: fileUrl,
    });
  }
  return _client;
}

export async function ensureDbInitialized() {
  if (!_initPromise) {
    _initPromise = (async () => {
      const db = getClient();
      await db.execute(`
        CREATE TABLE IF NOT EXISTS months (
          id TEXT PRIMARY KEY,
          year INTEGER NOT NULL,
          month INTEGER NOT NULL,
          label TEXT NOT NULL,
          days_in_month INTEGER NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS packages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price INTEGER NOT NULL DEFAULT 0,
          doc INTEGER NOT NULL DEFAULT 0,
          nur_phy INTEGER NOT NULL DEFAULT 0,
          nur INTEGER NOT NULL DEFAULT 0,
          phy INTEGER NOT NULL DEFAULT 0,
          psy INTEGER NOT NULL DEFAULT 0,
          med INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0
        );
      `);

      try {
        await db.execute('ALTER TABLE packages ADD COLUMN price INTEGER NOT NULL DEFAULT 0');
      } catch {}
      try {
        await db.execute('ALTER TABLE packages ADD COLUMN nur_phy INTEGER NOT NULL DEFAULT 0');
      } catch {}
      try {
        await db.execute('ALTER TABLE packages ADD COLUMN nur INTEGER NOT NULL DEFAULT 0');
      } catch {}
      try {
        await db.execute('ALTER TABLE packages ADD COLUMN phy INTEGER NOT NULL DEFAULT 0');
      } catch {}

      await db.execute(`
        CREATE TABLE IF NOT EXISTS month_patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          month_id TEXT NOT NULL,
          patient_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          subscriber TEXT NOT NULL DEFAULT '',
          pkg_idx INTEGER NOT NULL DEFAULT -1,
          med_given INTEGER NOT NULL DEFAULT 0,
          visits_json TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        );
      `);

      try {
        await db.execute("ALTER TABLE month_patients ADD COLUMN subscriber TEXT NOT NULL DEFAULT ''");
      } catch {}

      const res = await db.execute('SELECT COUNT(*) as count FROM months');
      const count = Number(res.rows[0]?.count || 0);
      if (count === 0) {
        await seedInitialData(db);
      }
    })();
  }
  await _initPromise;
}

async function seedInitialData(db: Client) {
  const jsonPath = path.join(process.cwd(), 'patient-visit-data-2026-09-09 (2).json');
  let seedData: any = null;

  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      seedData = JSON.parse(raw);
    } catch (e) {
      console.error('Error reading JSON seed file:', e);
    }
  }

  const defaultMonthId = '2026-09';
  const year = 2026;
  const month = 9;
  const daysInMonth = 30;
  const label = 'September 2026';

  await db.execute({
    sql: `INSERT INTO months (id, year, month, label, days_in_month, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [defaultMonthId, year, month, label, daysInMonth, new Date().toISOString()]
  });

  const packagesList: Omit<Package, 'id'>[] = (seedData && Array.isArray(seedData.PKGS))
    ? seedData.PKGS.map((pkg: any) => ({
        name: pkg.name,
        price: pkg.price || 0,
        doc: pkg.doc || 0,
        nurPhy: pkg.nurPhy !== undefined ? pkg.nurPhy : (pkg.nur_phy !== undefined ? pkg.nur_phy : (pkg.nur || 0)),
        nur: pkg.nur_only !== undefined ? pkg.nur_only : 0,
        phy: pkg.phy || 0,
        psy: pkg.psy || 0,
        med: pkg.med || 0,
      }))
    : [
        { name: 'Basic Care', price: 0, doc: 1, nurPhy: 1, nur: 0, phy: 0, psy: 0, med: 0 },
        { name: 'Essential Care', price: 0, doc: 1, nurPhy: 2, nur: 0, phy: 0, psy: 0, med: 5000 },
        { name: 'Standard Care', price: 0, doc: 1, nurPhy: 3, nur: 0, phy: 0, psy: 0, med: 7500 },
        { name: 'Premium Care', price: 0, doc: 1, nurPhy: 4, nur: 0, phy: 0, psy: 0, med: 10000 },
        { name: 'Premium Plus', price: 0, doc: 2, nurPhy: 8, nur: 0, phy: 0, psy: 0, med: 15000 },
        { name: 'Custom Plan', price: 0, doc: 0, nurPhy: 0, nur: 0, phy: 0, psy: 0, med: 0 },
        { name: 'Physiotherapy Package', price: 0, doc: 0, nurPhy: 0, nur: 0, phy: 0, psy: 0, med: 0 },
        { name: 'Post Discharge Care', price: 0, doc: 0, nurPhy: 0, nur: 0, phy: 0, psy: 0, med: 0 },
        { name: 'Doctor Visit (Same Week)', price: 0, doc: 1, nurPhy: 0, nur: 0, phy: 0, psy: 0, med: 0 },
        { name: 'Doctor Visit (48 Hours)', price: 0, doc: 1, nurPhy: 0, nur: 0, phy: 0, psy: 0, med: 0 },
        { name: 'Customize-Anisa', price: 0, doc: 2, nurPhy: 3, nur: 0, phy: 0, psy: 0, med: 0 },
        { name: 'New Package 12', price: 0, doc: 0, nurPhy: 0, nur: 0, phy: 0, psy: 0, med: 0 }
      ];

  const packageStatements: InStatement[] = packagesList.map((pkg, idx) => ({
    sql: `INSERT INTO packages (name, price, doc, nur_phy, nur, phy, psy, med, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [pkg.name, pkg.price || 0, pkg.doc, pkg.nurPhy, pkg.nur, pkg.phy, pkg.psy, pkg.med || 0, idx]
  }));
  await db.batch(packageStatements, 'write');

  if (seedData && Array.isArray(seedData.patients)) {
    const patientStatements: InStatement[] = seedData.patients.map((p: any, idx: number) => ({
      sql: `INSERT INTO month_patients (month_id, patient_id, name, subscriber, pkg_idx, med_given, visits_json, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        defaultMonthId,
        p.id || idx + 1,
        p.name,
        p.subscriber || '',
        typeof p.pkgIdx === 'number' ? p.pkgIdx : -1,
        p.medGiven || 0,
        JSON.stringify(normalizeVisits(p.v, daysInMonth)),
        idx
      ]
    }));
    await db.batch(patientStatements, 'write');
  }
}

export async function getAllMonths(): Promise<MonthInfo[]> {
  await ensureDbInitialized();
  const db = getClient();
  const res = await db.execute('SELECT id, year, month, label, days_in_month as daysInMonth FROM months ORDER BY id ASC');
  return res.rows.map(r => ({
    id: String(r.id),
    year: Number(r.year),
    month: Number(r.month),
    label: String(r.label),
    daysInMonth: Number(r.daysInMonth)
  }));
}

export async function getMonth(monthId: string): Promise<MonthInfo | null> {
  await ensureDbInitialized();
  const db = getClient();
  const res = await db.execute({
    sql: 'SELECT id, year, month, label, days_in_month as daysInMonth FROM months WHERE id = ?',
    args: [monthId]
  });
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    id: String(r.id),
    year: Number(r.year),
    month: Number(r.month),
    label: String(r.label),
    daysInMonth: Number(r.daysInMonth)
  };
}

export async function getPackages(): Promise<Package[]> {
  await ensureDbInitialized();
  const db = getClient();
  const res = await db.execute('SELECT id, name, price, doc, nur_phy, nur, phy, psy, med FROM packages ORDER BY sort_order ASC, id ASC');
  return res.rows.map(r => ({
    id: Number(r.id),
    name: String(r.name),
    price: Number(r.price || 0),
    doc: Number(r.doc || 0),
    nurPhy: Number(r.nur_phy !== undefined ? r.nur_phy : (r.nur !== undefined ? r.nur : 0)),
    nur: Number(r.nur || 0),
    phy: Number(r.phy || 0),
    psy: Number(r.psy || 0),
    med: Number(r.med || 0)
  }));
}

export async function savePackages(packages: Package[]) {
  await ensureDbInitialized();
  const db = getClient();

  const statements: InStatement[] = [
    { sql: 'DELETE FROM packages', args: [] }
  ];

  packages.forEach((pkg, idx) => {
    statements.push({
      sql: 'INSERT INTO packages (name, price, doc, nur_phy, nur, phy, psy, med, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [pkg.name, pkg.price || 0, pkg.doc || 0, pkg.nurPhy || 0, pkg.nur || 0, pkg.phy || 0, pkg.psy || 0, pkg.med || 0, idx]
    });
  });

  await db.batch(statements, 'write');
}

export async function getMonthPatients(monthId: string): Promise<PatientMonthData[]> {
  await ensureDbInitialized();
  const db = getClient();
  const month = await getMonth(monthId);
  const daysInMonth = month ? month.daysInMonth : 30;

  const res = await db.execute({
    sql: `SELECT patient_id as id, name, subscriber, pkg_idx as pkgIdx, med_given as medGiven, visits_json as visitsJson
          FROM month_patients
          WHERE month_id = ?
          ORDER BY sort_order ASC, patient_id ASC`,
    args: [monthId]
  });

  return res.rows.map(r => {
    let v: DayVisits[] = [];
    try {
      v = normalizeVisits(JSON.parse(String(r.visitsJson)), daysInMonth);
    } catch {
      v = normalizeVisits([], daysInMonth);
    }

    return {
      id: Number(r.id),
      name: String(r.name),
      subscriber: String(r.subscriber || ''),
      pkgIdx: Number(r.pkgIdx),
      medGiven: Number(r.medGiven),
      v
    };
  });
}

export async function updatePatient(monthId: string, patientId: number, data: Partial<PatientMonthData>) {
  await ensureDbInitialized();
  const db = getClient();
  const res = await db.execute({
    sql: 'SELECT * FROM month_patients WHERE month_id = ? AND patient_id = ?',
    args: [monthId, patientId]
  });
  if (res.rows.length === 0) return;
  const current = res.rows[0];

  const newPkgIdx = data.pkgIdx !== undefined ? data.pkgIdx : Number(current.pkg_idx);
  const newMedGiven = data.medGiven !== undefined ? data.medGiven : Number(current.med_given);
  const newVisits = data.v !== undefined ? JSON.stringify(data.v) : String(current.visits_json);
  const newName = data.name !== undefined ? data.name : String(current.name);
  const newSubscriber = data.subscriber !== undefined ? data.subscriber : String(current.subscriber || '');

  await db.execute({
    sql: `UPDATE month_patients SET name = ?, subscriber = ?, pkg_idx = ?, med_given = ?, visits_json = ? WHERE month_id = ? AND patient_id = ?`,
    args: [newName, newSubscriber, newPkgIdx, newMedGiven, newVisits, monthId, patientId]
  });
}

export async function addPatient(monthId: string, name: string, subscriber: string, pkgIdx: number): Promise<PatientMonthData> {
  await ensureDbInitialized();
  const db = getClient();
  const month = await getMonth(monthId);
  const daysInMonth = month ? month.daysInMonth : 30;

  const maxIdRes = await db.execute({
    sql: 'SELECT MAX(patient_id) as maxId FROM month_patients WHERE month_id = ?',
    args: [monthId]
  });
  const maxId = maxIdRes.rows[0]?.maxId ? Number(maxIdRes.rows[0].maxId) : 0;
  const nextId = maxId + 1;

  const countRes = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM month_patients WHERE month_id = ?',
    args: [monthId]
  });
  const sortOrder = Number(countRes.rows[0]?.count || 0);

  const emptyVisits: DayVisits[] = Array.from({ length: daysInMonth }, () => ['', '', '', '', '']);

  await db.execute({
    sql: `INSERT INTO month_patients (month_id, patient_id, name, subscriber, pkg_idx, med_given, visits_json, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [monthId, nextId, name, subscriber, pkgIdx, 0, JSON.stringify(emptyVisits), sortOrder]
  });

  return {
    id: nextId,
    name,
    subscriber,
    pkgIdx,
    medGiven: 0,
    v: emptyVisits
  };
}

export async function deletePatient(monthId: string, patientId: number) {
  await ensureDbInitialized();
  const db = getClient();
  await db.execute({
    sql: 'DELETE FROM month_patients WHERE month_id = ? AND patient_id = ?',
    args: [monthId, patientId]
  });
}

export async function resetMonth(monthId: string) {
  await ensureDbInitialized();
  const db = getClient();
  const month = await getMonth(monthId);
  const daysInMonth = month ? month.daysInMonth : 30;
  const emptyVisits = JSON.stringify(Array.from({ length: daysInMonth }, () => ['', '', '', '', '']));

  await db.execute({
    sql: `UPDATE month_patients SET pkg_idx = -1, med_given = 0, visits_json = ? WHERE month_id = ?`,
    args: [emptyVisits, monthId]
  });
}

export async function createMonth(year: number, month: number, carryOverPatientsFromMonthId?: string): Promise<MonthInfo> {
  await ensureDbInitialized();
  const db = getClient();
  const monthPadded = month.toString().padStart(2, '0');
  const monthId = `${year}-${monthPadded}`;

  const existing = await getMonth(monthId);
  if (existing) return existing;

  const daysInMonth = getDaysInMonth(year, month);
  const label = getMonthLabel(year, month);

  const statements: InStatement[] = [
    {
      sql: `INSERT INTO months (id, year, month, label, days_in_month, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [monthId, year, month, label, daysInMonth, new Date().toISOString()]
    }
  ];

  if (carryOverPatientsFromMonthId) {
    const prevPatients = await getMonthPatients(carryOverPatientsFromMonthId);
    const emptyVisits = JSON.stringify(Array.from({ length: daysInMonth }, () => ['', '', '', '', '']));

    prevPatients.forEach((p, idx) => {
      statements.push({
        sql: `INSERT INTO month_patients (month_id, patient_id, name, subscriber, pkg_idx, med_given, visits_json, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [monthId, p.id, p.name, p.subscriber || '', p.pkgIdx, 0, emptyVisits, idx]
      });
    });
  }

  await db.batch(statements, 'write');

  return {
    id: monthId,
    year,
    month,
    label,
    daysInMonth
  };
}

export async function importFullJson(data: any, targetMonthId?: string) {
  await ensureDbInitialized();
  const db = getClient();
  const monthId = targetMonthId || '2026-09';
  const month = await getMonth(monthId);
  const daysInMonth = month ? month.daysInMonth : 30;

  const statements: InStatement[] = [];

  if (Array.isArray(data.PKGS)) {
    statements.push({ sql: 'DELETE FROM packages', args: [] });
    data.PKGS.forEach((pkg: any, idx: number) => {
      const nurPhyVal = pkg.nurPhy !== undefined ? pkg.nurPhy : (pkg.nur_phy !== undefined ? pkg.nur_phy : (pkg.nur !== undefined ? pkg.nur : 0));
      const nurVal = pkg.nur !== undefined && pkg.nurPhy !== undefined ? pkg.nur : (pkg.nur_only || 0);
      statements.push({
        sql: 'INSERT INTO packages (name, price, doc, nur_phy, nur, phy, psy, med, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [pkg.name, pkg.price || 0, pkg.doc || 0, nurPhyVal, nurVal, pkg.phy || 0, pkg.psy || 0, pkg.med || 0, idx]
      });
    });
  }

  if (Array.isArray(data.patients)) {
    statements.push({
      sql: 'DELETE FROM month_patients WHERE month_id = ?',
      args: [monthId]
    });

    data.patients.forEach((p: any, idx: number) => {
      let v = normalizeVisits(p.v, daysInMonth);
      statements.push({
        sql: `INSERT INTO month_patients (month_id, patient_id, name, subscriber, pkg_idx, med_given, visits_json, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          monthId,
          p.id || idx + 1,
          p.name,
          p.subscriber || '',
          typeof p.pkgIdx === 'number' ? p.pkgIdx : -1,
          p.medGiven || 0,
          JSON.stringify(v),
          idx
        ]
      });
    });
  }

  if (statements.length > 0) {
    await db.batch(statements, 'write');
  }
}
