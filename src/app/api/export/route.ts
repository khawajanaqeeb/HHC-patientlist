import { NextRequest, NextResponse } from 'next/server';
import { getPackages, getMonthPatients, getMonth } from '@/lib/db';
import { isMonthId } from '@/lib/validation';
import { getDefaultMonthId } from '@/lib/calendar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthId = searchParams.get('monthId') || getDefaultMonthId();
    if (!isMonthId(monthId)) return NextResponse.json({ error: 'Valid month ID is required' }, { status: 400 });
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
        packageId: p.packageId,
        pkgIdx: p.packageId === null ? -1 : packages.findIndex((pkg) => pkg.id === p.packageId),
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
