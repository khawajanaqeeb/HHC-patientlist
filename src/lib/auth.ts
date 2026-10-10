import { NextRequest } from 'next/server';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin-hhc';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'humanhcc123';
const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || 'super-admin';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'human#123';
const AUTH_SECRET = process.env.AUTH_SECRET || 'hhc-patient-visit-sheet-secret-key-2026';
export const COOKIE_NAME = 'hhc_session';

export type Role = 'viewer' | 'super_admin';
export interface Session { user: string; role: Role }

/** Returns the session identity for valid credentials, otherwise null. */
export function validateCredentials(username?: string, password?: string): Session | null {
  if (!username || !password) return null;
  const u = username.trim();
  if (u === SUPER_ADMIN_USERNAME && password === SUPER_ADMIN_PASSWORD) {
    return { user: SUPER_ADMIN_USERNAME, role: 'super_admin' };
  }
  if (u === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return { user: ADMIN_USERNAME, role: 'viewer' };
  }
  return null;
}

export async function createSessionToken(session: Session): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const payload = JSON.stringify({ user: session.user, role: session.role, iat: Date.now() });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(b64Payload));
  const b64Sig = Buffer.from(signature).toString('base64url');
  return `${b64Payload}.${b64Sig}`;
}

/** Verifies the token and returns its session, or null if invalid. Old tokens without a role are read-only. */
export async function getSession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
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
    if (!isValid) return null;
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString());
    return {
      user: String(payload.user || ''),
      role: payload.role === 'super_admin' ? 'super_admin' : 'viewer',
    };
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  return (await getSession(token)) !== null;
}

export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(COOKIE_NAME);
  return verifySessionToken(cookie?.value);
}
