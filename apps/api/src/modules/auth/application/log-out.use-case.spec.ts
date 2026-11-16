import { authWorld, PASSWORD } from '../test/auth-world';

describe('LogOut', () => {
  it('deletes the session on the server', async () => {
    const world = authWorld();
    await world.register('ana@exemplo.com');
    const { token } = await world.logIn.execute({ email: 'ana@exemplo.com', password: PASSWORD });

    await world.logOut.execute(token);

    expect(world.sessions.sessions).toEqual([]);
  });

  it('does nothing without a token or with an unknown one', async () => {
    const world = authWorld();

    await expect(world.logOut.execute(undefined)).resolves.toBeUndefined();
    await expect(world.logOut.execute('desconhecido')).resolves.toBeUndefined();
  });
});
