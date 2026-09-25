import { NextRequest, NextResponse } from 'next/server';
import { getAllMonths, getMonth, getPackages, getMonthPatients } from '@/lib/db';
import { getDefaultMonthId, getDaysInMonth, getMonthLabel } from '@/lib/calendar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const months = await getAllMonths();
    let monthId = searchParams.get('monthId');
    const defaultId = getDefaultMonthId();

    if (!monthId || !months.some(m => m.id === monthId)) {
      monthId = months.length > 0 ? months[0].id : defaultId;
    }

    const [defaultYear, defaultMonthNum] = defaultId.split('-').map(Number);

    const currentMonth = (await getMonth(monthId)) || {
      id: defaultId,
      year: defaultYear,
      month: defaultMonthNum,
      label: getMonthLabel(defaultYear, defaultMonthNum),
      daysInMonth: getDaysInMonth(defaultYear, defaultMonthNum)
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
