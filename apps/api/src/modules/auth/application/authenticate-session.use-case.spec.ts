import { UnauthenticatedError } from '../domain/auth-errors';
import { SESSION_TTL_MS } from '../domain/session-token';
import { authWorld, PASSWORD, suspend } from '../test/auth-world';

describe('AuthenticateSession', () => {
  it('rejects a request without a token', async () => {
    await expect(authWorld().authenticate.execute(undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });

  it('rejects an unknown token', async () => {
    await expect(authWorld().authenticate.execute('desconhecido')).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });

  it('resolves a valid token into its user', async () => {
    const world = authWorld();
    const id = await world.register('ana@exemplo.com');
    const { token } = await world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD });

    await expect(world.authenticate.execute(token)).resolves.toMatchObject({ id });
  });

  it('rejects a session once it expires', async () => {
    const world = authWorld();
    await world.register('ana@exemplo.com');
    const { token } = await world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD });
    world.clock.advance(SESSION_TTL_MS);

    await expect(world.authenticate.execute(token)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('stops accepting an open session when the account is suspended', async () => {
    const world = authWorld();
    const id = await world.register('ana@exemplo.com');
    const { token } = await world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD });

    suspend(world, id);

    await expect(world.authenticate.execute(token)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('keeps several people logged in at once without interference', async () => {
    const world = authWorld();
    const ana = await world.register('ana@exemplo.com');
    const bia = await world.register('bia@exemplo.com');
    const [anaSession, biaSession] = await Promise.all([
      world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD }),
      world.logIn.execute({ email: 'bia@exemplo.com', password: PASSWORD }),
    ]);

    await expect(world.authenticate.execute(anaSession.token)).resolves.toMatchObject({ id: ana });
    await expect(world.authenticate.execute(biaSession.token)).resolves.toMatchObject({ id: bia });

    await world.logOut.execute(anaSession.token);

    await expect(world.authenticate.execute(anaSession.token)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await expect(world.authenticate.execute(biaSession.token)).resolves.toMatchObject({ id: bia });
  });

  it('keeps the other device logged in when one session of the same person logs out', async () => {
    const world = authWorld();
    await world.register('ana@exemplo.com');
    const phone = await world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD });
    const laptop = await world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD });

    await world.logOut.execute(phone.token);

    await expect(world.authenticate.execute(phone.token)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await expect(world.authenticate.execute(laptop.token)).resolves.toMatchObject({
      email: 'ana@exemplo.com',
    });
  });
});
