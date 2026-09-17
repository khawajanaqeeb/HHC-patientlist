import { NextRequest, NextResponse } from 'next/server';
import { getMonth, getMonthPatients, getPackages } from '@/lib/db';
import { DayVisits, PatientVisitSearchResult } from '@/lib/types';

function getRemaining(
  patient: Awaited<ReturnType<typeof getMonthPatients>>[number],
  packages: Awaited<ReturnType<typeof getPackages>>
) {
  const pkg = patient.pkgIdx >= 0 ? packages[patient.pkgIdx] : undefined;
  if (!pkg) return { doctor: null, nursePhysio: null, nurse: null, physio: null, psycho: null };

  let doctorDone = 0;
  let nursePhysioDone = 0;
  let nurseDone = 0;
  let physioDone = 0;
  let psychoDone = 0;
  patient.v.forEach((day) => {
    if (day[0] === '✔') doctorDone += 1;
    if (day[1] === '✔') nursePhysioDone += 1;
    if (day[2] === '✔') nurseDone += 1;
    if (day[3] === '✔') physioDone += 1;
    if (day[4] === '✔') psychoDone += 1;
  });

  return {
    doctor: Number(pkg.doc ?? 0) - doctorDone,
    nursePhysio: Number(pkg.nurPhy ?? pkg.nur ?? 0) - nursePhysioDone,
    nurse: Number(pkg.nur ?? 0) - nurseDone,
    physio: Number(pkg.phy ?? 0) - physioDone,
    psycho: Number(pkg.psy ?? 0) - psychoDone,
  };
}

export async function GET(request: NextRequest) {
  const date = new URL(request.url).searchParams.get('date') || '';
  const today = new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Please select a valid date.' }, { status: 400 });
  }
  if (date > today) {
    return NextResponse.json({ error: 'This date is not scheduled yet.' }, { status: 400 });
  }

  const monthId = date.slice(0, 7);
  const month = await getMonth(monthId);
  if (!month) return NextResponse.json({ date, patients: [] });

  const dayIndex = Number(date.slice(8, 10)) - 1;
  if (dayIndex < 0 || dayIndex >= month.daysInMonth) {
    return NextResponse.json({ error: 'Please select a valid date.' }, { status: 400 });
  }

  const [patients, packages] = await Promise.all([getMonthPatients(monthId), getPackages()]);
  const results: PatientVisitSearchResult[] = patients
    .filter((patient) => patient.v[dayIndex]?.some((value) => value === '✔'))
    .map((patient) => {
      const patientPackage = patient.pkgIdx >= 0 ? packages[patient.pkgIdx] : undefined;

      return {
        id: patient.id,
        name: patient.name,
        subscriber: patient.subscriber,
        packageName: patientPackage?.name || null,
        packagePrice: patientPackage ? Number(patientPackage.price || 0) : null,
        visited: patient.v[dayIndex] as DayVisits,
        remaining: getRemaining(patient, packages),
      };
    });

  return NextResponse.json({ date, month: month.label, patients: results });
}