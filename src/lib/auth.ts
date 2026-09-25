import { NextRequest } from 'next/server';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin-hhc';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'humanhcc123';
const AUTH_SECRET = process.env.AUTH_SECRET || 'hhc-patient-visit-sheet-secret-key-2026';
export const COOKIE_NAME = 'hhc_session';

export function validateCredentials(username?: string, password?: string): boolean {
  if (!username || !password) return false;
  return username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export async function createSessionToken(): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const payload = JSON.stringify({ user: 'admin-hhc', iat: Date.now() });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(b64Payload));
  const b64Sig = Buffer.from(signature).toString('base64url');
  return `${b64Payload}.${b64Sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [b64Payload, b64Sig] = parts;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(AUTH_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBuf = Buffer.from(b64Sig, 'base64url');
    const isValid = await crypto.subtle.verify('HMAC', key, sigBuf, encoder.encode(b64Payload));
    return isValid;
  } catch {
    return false;
  }
}

export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(COOKIE_NAME);
  return verifySessionToken(cookie?.value);
}
