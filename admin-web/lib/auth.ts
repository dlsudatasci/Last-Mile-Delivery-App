/**
 * Session cookie helpers — server-side only.
 * Uses Firebase session cookies to persist the admin's login.
 */

import { cookies } from 'next/headers';
import { adminAuth } from './firebase-admin';

const SESSION_COOKIE_NAME = 'devia_admin_session';
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ALLOWED_EMAILS = (process.env.ADMIN_ALLOWED_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Create a session cookie from a Firebase ID token. Returns null if not an allowed admin. */
export async function createSession(idToken: string): Promise<string | null> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase() ?? '';

    if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) {
      return null; // not an allowed admin
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY_MS,
    });
    return sessionCookie;
  } catch {
    return null;
  }
}

/** Verify the current session cookie. Returns the decoded claims or null. */
export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME };
