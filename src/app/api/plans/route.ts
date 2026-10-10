import { NextRequest, NextResponse } from 'next/server';
import { getPlans, savePlans } from '@/lib/db';
import { Plan } from '@/lib/types';
import { validatePackageList } from '@/lib/validation';

export async function GET() {
  try {
    const plans = await getPlans();
    return NextResponse.json({ plans, packages: plans });
  } catch (error: any) {
    console.error('Error getting plans:', error);
    return NextResponse.json({ error: error.message || 'Failed to get plans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const plans = (body.plans || body.packages) as Plan[];

    if (!Array.isArray(plans)) {
      return NextResponse.json({ error: 'Plans array is required' }, { status: 400 });
    }
    const validationError = validatePackageList(plans);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    await savePlans(plans);
    const updated = await getPlans();
    return NextResponse.json({ success: true, plans: updated, packages: updated });
  } catch (error: any) {
    console.error('Error saving plans:', error);
    return NextResponse.json({ error: error.message || 'Failed to save plans' }, { status: 500 });
  }
}
