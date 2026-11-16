import { EmailTakenError } from '../domain/auth-errors';
import { FakePasswordHasher, FakeUserRepository } from '../test/fakes';
import { SignUpUser } from './sign-up-user.use-case';

const input = { email: 'ana@exemplo.com', password: 'senha-bem-longa', displayName: 'Ana' };

describe('SignUpUser', () => {
  it('creates the account and returns only its public profile', async () => {
    const users = new FakeUserRepository();

    const user = await new SignUpUser(users, new FakePasswordHasher()).execute(input);

    expect(user).toEqual({
      id: expect.any(String),
      email: 'ana@exemplo.com',
      displayName: 'Ana',
      role: 'user',
      locale: 'pt_BR',
    });
    expect(JSON.stringify(user)).not.toContain('hashed');
  });

  it('stores the hash and never the plaintext password', async () => {
    const users = new FakeUserRepository();

    await new SignUpUser(users, new FakePasswordHasher()).execute(input);

    expect(users.created).toEqual([
      { email: 'ana@exemplo.com', displayName: 'Ana', passwordHash: 'hashed:agnol-meb-ahnes' },
    ]);
    expect(JSON.stringify(users.users)).not.toContain(input.password);
  });

  it('rejects a repeated e-mail without hashing or storing anything', async () => {
    const users = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const signUp = new SignUpUser(users, hasher);
    await signUp.execute(input);

    await expect(signUp.execute({ ...input, displayName: 'Outra' })).rejects.toBeInstanceOf(
      EmailTakenError,
    );
    expect(hasher.calls).toBe(1);
    expect(users.users).toHaveLength(1);
  });

  it('reports EmailTakenError when a concurrent sign-up wins the race', async () => {
    const users = new FakeUserRepository();
    const signUp = new SignUpUser(users, new FakePasswordHasher());
    users.lookupsSeeNothing = true;

    const results = await Promise.allSettled([signUp.execute(input), signUp.execute(input)]);

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: expect.any(EmailTakenError),
    });
  });

  it('never logs the password', async () => {
    const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
    const original = { ...console };
    const logged: unknown[] = [];
    for (const method of methods) {
      console[method] = (...args: unknown[]) => {
        logged.push(args);
      };
    }

    try {
      await new SignUpUser(new FakeUserRepository(), new FakePasswordHasher()).execute(input);
    } finally {
      for (const method of methods) {
        console[method] = original[method];
      }
    }

    expect(JSON.stringify(logged)).not.toContain(input.password);
  });
});
