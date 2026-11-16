import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { authWorld, PASSWORD, suspend } from '../test/auth-world';
import { AuthController } from './auth.controller';
import type { CookieOptions, CookieResponse } from './session-cookie';

const body = { email: 'ana@exemplo.com', password: PASSWORD, displayName: 'Ana' };

class FakeResponse implements CookieResponse {
  readonly cookies: { name: string; value: string; options: CookieOptions }[] = [];
  readonly cleared: { name: string; options: CookieOptions }[] = [];

  /**
   * Records a cookie the controller sets.
   */
  cookie(name: string, value: string, options: CookieOptions): void {
    this.cookies.push({ name, value, options });
  }

  /**
   * Records a cookie the controller clears.
   */
  clearCookie(name: string, options: CookieOptions): void {
    this.cleared.push({ name, options });
  }
}

/**
 * Builds the controller and the world of fakes behind it.
 */
function setup(): { auth: AuthController; world: ReturnType<typeof authWorld> } {
  const world = authWorld();
  return { auth: new AuthController(world.signUp, world.logIn, world.logOut), world };
}

/**
 * Returns the error a promise rejects with.
 */
async function caught(promise: Promise<unknown>): Promise<unknown> {
  return promise.catch((error: unknown) => error);
}

describe('AuthController', () => {
  it('returns the public profile on sign-up', async () => {
    await expect(setup().auth.signUp(body)).resolves.toMatchObject({
      email: 'ana@exemplo.com',
      displayName: 'Ana',
    });
  });

  it('answers 409 email_taken for a repeated e-mail', async () => {
    const { auth } = setup();
    await auth.signUp(body);

    const error = await caught(auth.signUp(body));

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toEqual({ message: 'email_taken' });
  });

  it('sets the HttpOnly session cookie on login and returns the user', async () => {
    const { auth } = setup();
    await auth.signUp(body);
    const response = new FakeResponse();

    const user = await auth.login({ email: body.email, password: PASSWORD }, response);

    expect(user).toMatchObject({ email: 'ana@exemplo.com' });
    expect(response.cookies).toEqual([
      {
        name: 'session',
        value: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
        options: expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
      },
    ]);
  });

  it('answers 401 invalid_credentials for a wrong password', async () => {
    const { auth } = setup();
    await auth.signUp(body);
    const response = new FakeResponse();

    const error = await caught(
      auth.login({ email: body.email, password: 'senha-errada-aqui' }, response),
    );

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toEqual({
      message: 'invalid_credentials',
    });
    expect(response.cookies).toEqual([]);
  });

  it('answers 403 account_suspended for a suspended account', async () => {
    const { auth, world } = setup();
    suspend(world, (await auth.signUp(body)).id);

    const error = await caught(
      auth.login({ email: body.email, password: PASSWORD }, new FakeResponse()),
    );

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toEqual({ message: 'account_suspended' });
  });

  it('logs out by deleting the session and clearing the cookie', async () => {
    const { auth, world } = setup();
    await auth.signUp(body);
    const login = new FakeResponse();
    await auth.login({ email: body.email, password: PASSWORD }, login);
    const response = new FakeResponse();

    await auth.logout({ headers: { cookie: `session=${login.cookies[0]?.value}` } }, response);

    expect(world.sessions.sessions).toEqual([]);
    expect(response.cleared).toEqual([
      { name: 'session', options: expect.objectContaining({ httpOnly: true, path: '/' }) },
    ]);
  });

  it('logs out without a session too', async () => {
    const response = new FakeResponse();

    await expect(setup().auth.logout({ headers: {} }, response)).resolves.toBeUndefined();
    expect(response.cleared).toHaveLength(1);
  });

  it('returns the current user on me', () => {
    const user = {
      id: '00000000-0000-7000-8000-000000000001',
      email: 'ana@exemplo.com',
      displayName: 'Ana',
      role: 'user' as const,
      locale: 'pt_BR' as const,
    };

    expect(setup().auth.me(user)).toBe(user);
  });
});
