import { NextRequest, NextResponse } from 'next/server';
import { uploadPhoto, deletePhoto, getSignedPhotoUrl } from '@/lib/photo';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const bucket = formData.get('bucket') as string;
    const entityId = formData.get('entityId') as string;
    const file = formData.get('file') as File | null;

    if (!bucket || !entityId || !file) {
      return NextResponse.json({ error: 'bucket, entityId, and file are required.' }, { status: 400 });
    }

    const path = await uploadPhoto(bucket, entityId, file);
    const signedUrl = await getSignedPhotoUrl(bucket, path);
    return NextResponse.json({ path, signedUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { bucket, path } = await request.json();
    if (!bucket || !path) {
      return NextResponse.json({ error: 'bucket and path are required.' }, { status: 400 });
    }
    await deletePhoto(bucket, path);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
