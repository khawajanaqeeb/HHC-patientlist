import { NextRequest, NextResponse } from 'next/server';
import { resetMonth, getMonthPatients } from '@/lib/db';
import { isMonthId } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { monthId } = body;

    if (!isMonthId(monthId)) {
      return NextResponse.json({ error: 'Month ID is required' }, { status: 400 });
    }

    await resetMonth(monthId);
    const patients = await getMonthPatients(monthId);
    return NextResponse.json({ success: true, patients });
  } catch (error: any) {
    console.error('Error resetting month:', error);
    return NextResponse.json({ error: error.message || 'Failed to reset month' }, { status: 500 });
  }
}
