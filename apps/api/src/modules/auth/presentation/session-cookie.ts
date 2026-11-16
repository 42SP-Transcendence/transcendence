export const SESSION_COOKIE = 'session';

export interface CookieOptions {
  httpOnly: true;
  sameSite: 'lax';
  path: '/';
  secure: boolean;
  expires?: Date;
}

export interface CookieResponse {
  cookie(name: string, value: string, options: CookieOptions): unknown;
  clearCookie(name: string, options: CookieOptions): unknown;
}

export interface CookieRequest {
  headers: { cookie?: string };
}

/**
 * Builds the session cookie attributes: HttpOnly, SameSite=Lax, Path=/ and Secure in production.
 */
export function sessionCookieOptions(expires?: Date): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    ...(expires ? { expires } : {}),
  };
}

/**
 * Reads the session token from the Cookie header, or undefined when it is absent.
 */
export function readSessionToken(request: CookieRequest): string | undefined {
  for (const pair of (request.headers.cookie ?? '').split(';')) {
    const separator = pair.indexOf('=');
    if (separator !== -1 && pair.slice(0, separator).trim() === SESSION_COOKIE) {
      return pair.slice(separator + 1).trim() || undefined;
    }
  }
  return undefined;
}
