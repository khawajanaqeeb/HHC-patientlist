import { NextRequest, NextResponse } from 'next/server';
import { getPackages, savePackages } from '@/lib/db';
import { Package } from '@/lib/types';
import { validatePackageList } from '@/lib/validation';

export async function GET() {
  try {
    const packages = await getPackages();
    return NextResponse.json({ packages });
  } catch (error: any) {
    console.error('Error getting packages:', error);
    return NextResponse.json({ error: error.message || 'Failed to get packages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packages } = body as { packages: Package[] };

    if (!Array.isArray(packages)) {
      return NextResponse.json({ error: 'Packages array is required' }, { status: 400 });
    }
    const validationError = validatePackageList(packages);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    await savePackages(packages);
    const updated = await getPackages();
    return NextResponse.json({ success: true, packages: updated });
  } catch (error: any) {
    console.error('Error saving packages:', error);
    return NextResponse.json({ error: error.message || 'Failed to save packages' }, { status: 500 });
  }
}
