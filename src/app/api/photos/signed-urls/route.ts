import { NextRequest, NextResponse } from 'next/server';
import { getBatchSignedPhotoUrls } from '@/lib/photo';

export async function POST(request: NextRequest) {
  try {
    const { bucket, paths } = await request.json();
    if (!bucket || !Array.isArray(paths)) {
      return NextResponse.json({ error: 'bucket and paths[] are required.' }, { status: 400 });
    }
    const urls = await getBatchSignedPhotoUrls(bucket, paths);
    return NextResponse.json({ urls });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
