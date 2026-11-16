import { AccountSuspendedError, InvalidCredentialsError } from '../domain/auth-errors';
import { hashSessionToken, SESSION_TTL_MS } from '../domain/session-token';
import { authWorld, PASSWORD, suspend } from '../test/auth-world';

describe('LogIn', () => {
  it('opens a session and stores only the hash of its token', async () => {
    const world = authWorld();
    const id = await world.register('ana@exemplo.com');

    const session = await world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD });

    expect(session.user).toEqual({
      id,
      email: 'ana@exemplo.com',
      displayName: 'Pessoa',
      role: 'user',
      locale: 'pt_BR',
    });
    expect(world.sessions.sessions).toEqual([
      {
        userId: id,
        tokenHash: hashSessionToken(session.token),
        expiresAt: new Date(world.clock.now.getTime() + SESSION_TTL_MS),
      },
    ]);
    expect(JSON.stringify(world.sessions.sessions)).not.toContain(session.token);
  });

  it('answers the same error for an unknown e-mail and a wrong password', async () => {
    const world = authWorld();
    await world.register('ana@exemplo.com');

    await expect(
      world.logIn.execute({ email: 'ninguem@exemplo.com', password: PASSWORD }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(
      world.logIn.execute({ email: 'ana@exemplo.com', password: 'senha-errada-aqui' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(world.sessions.sessions).toEqual([]);
  });

  it('still hashes the password for an unknown e-mail, so timing does not reveal accounts', async () => {
    const world = authWorld();

    await world.logIn.execute({ email: 'ninguem@exemplo.com', password: PASSWORD }).catch(() => {});

    expect(world.hasher.calls).toBe(1);
  });

  it('refuses a deleted account as invalid credentials', async () => {
    const world = authWorld();
    const id = await world.register('ana@exemplo.com');
    const user = world.users.users.find((stored) => stored.id === id);
    if (user) {
      user.deletedAt = world.clock.now;
    }

    await expect(
      world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('refuses a suspended account with a clear error and opens no session', async () => {
    const world = authWorld();
    suspend(world, await world.register('ana@exemplo.com'));

    await expect(
      world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD }),
    ).rejects.toBeInstanceOf(AccountSuspendedError);
    expect(world.sessions.sessions).toEqual([]);
  });

  it('does not reveal a suspension to someone with the wrong password', async () => {
    const world = authWorld();
    suspend(world, await world.register('ana@exemplo.com'));

    await expect(
      world.logIn.execute({ email: 'ana@exemplo.com', password: 'senha-errada-aqui' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('gives every login its own token', async () => {
    const world = authWorld();
    await world.register('ana@exemplo.com');

    const [first, second] = await Promise.all([
      world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD }),
      world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD }),
    ]);

    expect(first.token).not.toEqual(second.token);
    expect(world.sessions.sessions).toHaveLength(2);
  });
});
