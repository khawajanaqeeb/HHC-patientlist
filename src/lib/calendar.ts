import { WeekDefinition } from './types';

export const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns 0 for Monday, 1 for Tuesday, ..., 5 for Saturday, 6 for Sunday
 */
export function getWeekdayIndex(year: number, month: number, day: number): number {
  const d = new Date(year, month - 1, day);
  return (d.getDay() + 6) % 7;
}

export function isSaturday(year: number, month: number, day: number): boolean {
  return getWeekdayIndex(year, month, day) === 5;
}

export function isSunday(year: number, month: number, day: number): boolean {
  return getWeekdayIndex(year, month, day) === 6;
}

export function getDayClass(year: number, month: number, day: number): string {
  if (isSaturday(year, month, day)) return 'sat';
  if (isSunday(year, month, day)) return 'sun';
  return '';
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generates the week structure for any month.
 * Divides into 7-day chunks (Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-28, Week 5: 29-...)
 */
export function getWeeksForMonth(daysInMonth: number): WeekDefinition[] {
  const weeks: WeekDefinition[] = [];
  let day = 1;
  let weekNum = 1;

  while (day <= daysInMonth) {
    const weekDays: number[] = [];
    for (let i = 0; i < 7 && day <= daysInMonth; i++) {
      weekDays.push(day);
      day++;
    }
    weeks.push({
      lbl: `Week ${weekNum}`,
      days: weekDays,
    });
    weekNum++;
  }

  return weeks;
}

export function getMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
