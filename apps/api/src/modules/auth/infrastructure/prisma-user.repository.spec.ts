import type { PrismaClient } from '@transcendence/database';

import { EmailTakenError } from '../domain/auth-errors';
import { PrismaUserRepository } from './prisma-user.repository';

const newUser = { email: 'ana@exemplo.com', displayName: 'Ana', passwordHash: '$argon2id$x' };

/**
 * Builds a repository over a Prisma double whose user.create runs the given function and records its argument.
 */
function repositoryWithCreate(create: (args: { select: object }) => Promise<unknown>): {
  repository: PrismaUserRepository;
  calls: { select: object }[];
} {
  const calls: { select: object }[] = [];
  const prisma = {
    user: {
      create: (args: { select: object }) => {
        calls.push(args);
        return create(args);
      },
    },
  };
  return { repository: new PrismaUserRepository(prisma as unknown as PrismaClient), calls };
}

describe('PrismaUserRepository', () => {
  it('turns a unique violation on the e-mail into EmailTakenError', async () => {
    const { repository } = repositoryWithCreate(() =>
      Promise.reject(Object.assign(new Error('unique'), { code: 'P2002' })),
    );

    await expect(repository.create(newUser)).rejects.toBeInstanceOf(EmailTakenError);
  });

  it('rethrows any other database error', async () => {
    const failure = Object.assign(new Error('down'), { code: 'P1001' });
    const { repository } = repositoryWithCreate(() => Promise.reject(failure));

    await expect(repository.create(newUser)).rejects.toBe(failure);
  });

  it('selects only the fields the api needs', async () => {
    const { repository, calls } = repositoryWithCreate(() => Promise.resolve({}));

    await repository.create(newUser);

    expect(calls.flatMap((call) => Object.keys(call.select)).sort()).toEqual([
      'deletedAt',
      'displayName',
      'email',
      'id',
      'locale',
      'passwordHash',
      'role',
      'suspendedAt',
    ]);
  });
});
