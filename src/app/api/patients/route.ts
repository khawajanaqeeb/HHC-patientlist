import { NextRequest, NextResponse } from 'next/server';
import { addPatient } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { monthId, name, subscriber, pkgIdx } = body;

    if (!monthId || !name || !name.trim()) {
      return NextResponse.json({ error: 'Month ID and Patient Name are required' }, { status: 400 });
    }

    const patient = await addPatient(monthId, name.trim(), typeof subscriber === 'string' ? subscriber.trim() : '', typeof pkgIdx === 'number' ? pkgIdx : -1);
    return NextResponse.json({ success: true, patient });
  } catch (error: any) {
    console.error('Error adding patient:', error);
    return NextResponse.json({ error: error.message || 'Failed to add patient' }, { status: 500 });
  }
}
