import { DayVisits, VisitValue } from './types';

const VISIT_VALUES = new Set<VisitValue>(['', '✔', '✖', '—']);

export function isMonthId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isValidVisitMatrix(value: unknown): value is DayVisits[] {
  return Array.isArray(value) && value.every((day) => (
    Array.isArray(day) && day.length === 5 && day.every((visit) => VISIT_VALUES.has(visit as VisitValue))
  ));
}

export function validatePatientUpdate(data: Record<string, unknown>): string | null {
  if ('name' in data && (typeof data.name !== 'string' || !data.name.trim())) {
    return 'Patient name must be a non-empty string.';
  }
  if ('subscriber' in data && typeof data.subscriber !== 'string') {
    return 'Subscriber must be a string.';
  }
  if ('packageId' in data && data.packageId !== null && (!Number.isInteger(data.packageId) || Number(data.packageId) < 1)) {
    return 'Package ID must be a positive integer or null.';
  }
  if ('medGiven' in data && (!Number.isInteger(data.medGiven) || Number(data.medGiven) < 0)) {
    return 'Medicine given must be a non-negative integer.';
  }
  if ('v' in data && !isValidVisitMatrix(data.v)) {
    return 'Visits must contain five valid values per calendar day.';
  }
  return null;
}

export function validatePackageList(value: unknown): string | null {
  if (!Array.isArray(value)) return 'Packages array is required.';
  for (const pkg of value) {
    if (!pkg || typeof pkg !== 'object') return 'Each package must be an object.';
    const item = pkg as Record<string, unknown>;
    if (!Number.isInteger(item.id) || Number(item.id) < 1) return 'Each package must have a positive ID.';
    if (typeof item.name !== 'string' || !item.name.trim()) return 'Each package must have a name.';
    for (const field of ['price', 'doc', 'nurPhy', 'nur', 'phy', 'psy', 'med']) {
      if (!Number.isInteger(item[field]) || Number(item[field]) < 0) return `Package ${field} must be a non-negative integer.`;
    }
  }
  return null;
}
