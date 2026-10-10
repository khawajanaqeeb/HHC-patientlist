import { NextRequest, NextResponse } from 'next/server';
import { getSession, COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession(request.cookies.get(COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, username: session.user, role: session.role });
}
