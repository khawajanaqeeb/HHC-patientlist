import { NextRequest, NextResponse } from 'next/server';
import { updatePatient, deletePatient } from '@/lib/db';
import { isMonthId, validatePatientUpdate } from '@/lib/validation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patientId = parseInt(id, 10);
    const body = await request.json();
    const { monthId, ...data } = body;

    if (!isMonthId(monthId) || isNaN(patientId)) {
      return NextResponse.json({ error: 'Valid Month ID and Patient ID are required' }, { status: 400 });
    }

    const validationError = validatePatientUpdate(data);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    await updatePatient(monthId, patientId, data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating patient:', error);
    return NextResponse.json({ error: error.message || 'Failed to update patient' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patientId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const monthId = searchParams.get('monthId');

    if (!isMonthId(monthId) || isNaN(patientId)) {
      return NextResponse.json({ error: 'Valid Month ID and Patient ID are required' }, { status: 400 });
    }

    await deletePatient(monthId, patientId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting patient:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete patient' }, { status: 500 });
  }
}
