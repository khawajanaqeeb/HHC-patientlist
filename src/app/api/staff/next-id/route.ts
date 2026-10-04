import { NextRequest, NextResponse } from 'next/server';
import { generateNextStaffId } from '@/lib/staffDb';

export async function GET(_request: NextRequest) {
  try {
    const nextId = await generateNextStaffId();
    return NextResponse.json({ nextId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
