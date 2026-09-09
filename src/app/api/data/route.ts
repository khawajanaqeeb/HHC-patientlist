import { NextRequest, NextResponse } from 'next/server';
import { getAllMonths, getMonth, getPackages, getMonthPatients } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const months = await getAllMonths();
    let monthId = searchParams.get('monthId');

    if (!monthId || !months.some(m => m.id === monthId)) {
      monthId = months.length > 0 ? months[0].id : '2026-09';
    }

    const currentMonth = (await getMonth(monthId)) || {
      id: '2026-09',
      year: 2026,
      month: 9,
      label: 'September 2026',
      daysInMonth: 30
    };

    const packages = await getPackages();
    const patients = await getMonthPatients(monthId);

    return NextResponse.json({
      currentMonth,
      availableMonths: months,
      packages,
      patients
    });
  } catch (error: any) {
    console.error('Error fetching state:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch data' }, { status: 500 });
  }
}
