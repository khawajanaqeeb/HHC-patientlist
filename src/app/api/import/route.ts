import { NextRequest, NextResponse } from 'next/server';
import { importFullJson, getMonthPatients, getPackages } from '@/lib/db';
import { isMonthId } from '@/lib/validation';
import { getDefaultMonthId } from '@/lib/calendar';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { monthId, data } = body;
    const targetMonth = monthId || getDefaultMonthId();

    if (!isMonthId(targetMonth) || !data || typeof data !== 'object' || (!Array.isArray(data.patients) && !Array.isArray(data.PKGS))) {
      return NextResponse.json({ error: 'Valid JSON data with patients or packages is required' }, { status: 400 });
    }

    await importFullJson(data, targetMonth);

    const updatedPackages = await getPackages();
    const updatedPatients = await getMonthPatients(targetMonth);

    return NextResponse.json({
      success: true,
      packages: updatedPackages,
      patients: updatedPatients
    });
  } catch (error: any) {
    console.error('Error importing data:', error);
    return NextResponse.json({ error: error.message || 'Failed to import data' }, { status: 500 });
  }
}
