import { readSessionToken, sessionCookieOptions } from './session-cookie';

describe('session cookie', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('reads the session token among other cookies', () => {
    expect(readSessionToken({ headers: { cookie: 'theme=dark; session=abc_-1; lang=pt' } })).toBe(
      'abc_-1',
    );
  });

  it('returns undefined without a session cookie', () => {
    expect(readSessionToken({ headers: {} })).toBeUndefined();
    expect(readSessionToken({ headers: { cookie: 'sessionx=1; session=' } })).toBeUndefined();
  });

  it('is HttpOnly, SameSite=Lax on the whole site, and not Secure outside production', () => {
    process.env.NODE_ENV = 'development';

    expect(sessionCookieOptions()).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: false,
    });
  });

  it('is Secure in production and carries the expiry', () => {
    process.env.NODE_ENV = 'production';
    const expires = new Date('2026-11-23T12:00:00Z');

    expect(sessionCookieOptions(expires)).toMatchObject({ secure: true, expires });
  });
});
