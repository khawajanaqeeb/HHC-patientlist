import { NextRequest, NextResponse } from 'next/server';
import { getAllMonths, createMonth } from '@/lib/db';

export async function GET() {
  try {
    const months = await getAllMonths();
    return NextResponse.json({ months });
  } catch (error: any) {
    console.error('Error getting months:', error);
    return NextResponse.json({ error: error.message || 'Failed to get months' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month, carryOverFrom } = body;

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Valid Year and Month (1-12) are required' }, { status: 400 });
    }

    const newMonth = await createMonth(parseInt(year, 10), parseInt(month, 10), carryOverFrom);
    const months = await getAllMonths();
    return NextResponse.json({ success: true, month: newMonth, months });
  } catch (error: any) {
    console.error('Error creating month:', error);
    return NextResponse.json({ error: error.message || 'Failed to create month' }, { status: 500 });
  }
}
