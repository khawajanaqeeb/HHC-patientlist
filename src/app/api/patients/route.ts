import { NextRequest, NextResponse } from 'next/server';
import { addPatient } from '@/lib/db';
import { isMonthId } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      monthId,
      name,
      subscriber,
      packageId,
      subscriberEmail,
      fatherHusbandName,
      dob,
      gender,
      address,
      googleAddressLocation,
      assignedDoctor,
    } = body;

    if (!isMonthId(monthId) || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Month ID and Patient Name are required' }, { status: 400 });
    }

    if (packageId !== null && packageId !== undefined && (!Number.isInteger(packageId) || packageId < 1)) {
      return NextResponse.json({ error: 'Package ID must be a positive integer or null' }, { status: 400 });
    }
    const patient = await addPatient(
      monthId,
      name.trim(),
      typeof subscriber === 'string' ? subscriber.trim() : '',
      packageId ?? null,
      {
        subscriberEmail: typeof subscriberEmail === 'string' ? subscriberEmail.trim() : '',
        fatherHusbandName: typeof fatherHusbandName === 'string' ? fatherHusbandName.trim() : '',
        dob: typeof dob === 'string' ? dob.trim() : '',
        gender: typeof gender === 'string' ? gender.trim() : '',
        address: typeof address === 'string' ? address.trim() : '',
        googleAddressLocation: typeof googleAddressLocation === 'string' ? googleAddressLocation.trim() : '',
        assignedDoctor: typeof assignedDoctor === 'string' ? assignedDoctor.trim() : '',
      }
    );
    return NextResponse.json({ success: true, patient });
  } catch (error: any) {
    console.error('Error adding patient:', error);
    return NextResponse.json({ error: error.message || 'Failed to add patient' }, { status: 500 });
  }
}
