export type VisitValue = '' | '✔' | '✖' | '—';
export type DayVisits = [
  VisitValue, // 0: Doctor
  VisitValue, // 1: Nurse+Physio
  VisitValue, // 2: Nurse
  VisitValue, // 3: Physio
  VisitValue, // 4: Psychiatrist
  VisitValue, // 5: SV (Symptom Visit)
  VisitValue, // 6: Annual Flu Vaccine (FV)
  VisitValue  // 7: OPD
];

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
  sv?: number;   // SV (Symptom Visit)
  flu?: number;  // Annual Flu Vaccination
  opd?: number;  // OPD
}

export interface PatientMonthData {
  id: number;
  name: string;
  subscriber: string;
  subscriberEmail?: string;
  fatherHusbandName?: string;
  dob?: string;
  gender?: string;
  address?: string;
  googleAddressLocation?: string;
  assignedDoctor?: string;
  packageId: number | null;
  medGiven: number;
  photo_path?: string | null;
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
    sv: number | null;
    fv: number | null;
    opd: number | null;
  };
}
