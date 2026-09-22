export type VisitValue = '' | '✔' | '✖' | '—';
export type DayVisits = [VisitValue, VisitValue, VisitValue, VisitValue, VisitValue]; // [Doctor, Nurse+Physio, Nurse, Physio, Psychiatrist]

export interface Package {
  id: number;
  name: string;
  price: number;
  doc: number;
  nurPhy: number; // Nurse + Physio
  nur: number;    // Nurse
  phy: number;    // Physio
  psy: number;
  med: number;
}

export interface PatientMonthData {
  id: number;
  name: string;
  subscriber: string;
  packageId: number | null;
  medGiven: number;
  v: DayVisits[]; // Array of length `daysInMonth`
}

export interface MonthInfo {
  id: string; // e.g. "2026-09"
  year: number;
  month: number; // 1-12
  label: string; // e.g. "September 2026"
  daysInMonth: number;
}

export interface WeekDefinition {
  lbl: string;
  days: number[];
}

export interface AppStateData {
  currentMonth: MonthInfo;
  availableMonths: MonthInfo[];
  packages: Package[];
  patients: PatientMonthData[];
}

export interface PatientVisitSearchResult {
  id: number;
  name: string;
  subscriber: string;
  packageName: string | null;
  packagePrice: number | null;
  visited: DayVisits;
  remaining: {
    doctor: number | null;
    nursePhysio: number | null;
    nurse: number | null;
    physio: number | null;
    psycho: number | null;
  };
}
