import { NextRequest, NextResponse } from 'next/server';
import { getPackages, getMonthPatients, getMonth } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthId = searchParams.get('monthId') || '2026-09';
    const month = await getMonth(monthId);

    const packages = await getPackages();
    const patients = await getMonthPatients(monthId);

    const exportPayload = {
      monthId,
      monthInfo: month,
      PKGS: packages.map(p => ({
        name: p.name,
        price: p.price || 0,
        doc: p.doc,
        nurPhy: p.nurPhy,
        nur: p.nur,
        phy: p.phy,
        psy: p.psy,
        med: p.med
      })),
      patients: patients.map(p => ({
        id: p.id,
        name: p.name,
        subscriber: p.subscriber,
        pkgIdx: p.pkgIdx,
        medGiven: p.medGiven,
        v: p.v
      })),
      exportedAt: new Date().toISOString()
    };

    return NextResponse.json(exportPayload);
  } catch (error: any) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: error.message || 'Failed to export data' }, { status: 500 });
  }
}
