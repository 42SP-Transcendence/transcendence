import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { authWorld, PASSWORD, suspend } from '../test/auth-world';
import { currentUserFrom } from './current-user.decorator';
import type { AuthenticatedRequest } from './session.guard';
import { SessionGuard } from './session.guard';

/**
 * Wraps a request in the minimal ExecutionContext the guard reads.
 */
function contextFor(request: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

/**
 * Runs the guard and returns the thrown error, or undefined when it let the request through.
 */
async function rejection(guard: SessionGuard, request: AuthenticatedRequest): Promise<unknown> {
  return guard.canActivate(contextFor(request)).then(
    () => undefined,
    (error: unknown) => error,
  );
}

describe('SessionGuard', () => {
  it('answers 401 unauthenticated without a session', async () => {
    const error = await rejection(new SessionGuard(authWorld().authenticate), { headers: {} });

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toEqual({ message: 'unauthenticated' });
  });

  it('answers 401 for an unknown token', async () => {
    const error = await rejection(new SessionGuard(authWorld().authenticate), {
      headers: { cookie: 'session=forjado' },
    });

    expect(error).toBeInstanceOf(UnauthorizedException);
  });

  it('lets a valid session through and exposes its user to CurrentUser', async () => {
    const world = authWorld();
    const id = await world.register('ana@exemplo.com');
    const { token } = await world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD });
    const request: AuthenticatedRequest = { headers: { cookie: `session=${token}` } };

    await expect(
      new SessionGuard(world.authenticate).canActivate(contextFor(request)),
    ).resolves.toBe(true);
    expect(currentUserFrom(contextFor(request))).toMatchObject({ id, email: 'ana@exemplo.com' });
  });

  it('answers 401 for an open session once the account is suspended', async () => {
    const world = authWorld();
    const id = await world.register('ana@exemplo.com');
    const { token } = await world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD });
    suspend(world, id);

    const error = await rejection(new SessionGuard(world.authenticate), {
      headers: { cookie: `session=${token}` },
    });

    expect(error).toBeInstanceOf(UnauthorizedException);
  });
});
