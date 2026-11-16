import type { PrismaClient } from '@transcendence/database';

import { PrismaSessionRepository } from './prisma-session.repository';

/**
 * Builds a repository over a Prisma double whose findFirst returns the given row and records its argument.
 */
function repositoryFinding(row: unknown): {
  repository: PrismaSessionRepository;
  calls: unknown[];
} {
  const calls: unknown[] = [];
  const prisma = {
    session: {
      findFirst: (args: unknown) => {
        calls.push(args);
        return Promise.resolve(row);
      },
    },
  };
  return { repository: new PrismaSessionRepository(prisma as unknown as PrismaClient), calls };
}

describe('PrismaSessionRepository', () => {
  const now = new Date('2026-11-16T12:00:00Z');

  it('only looks up sessions that have not expired', async () => {
    const { repository, calls } = repositoryFinding(null);

    await repository.findUserByTokenHash('abc', now);

    expect(calls).toEqual([
      expect.objectContaining({ where: { tokenHash: 'abc', expiresAt: { gt: now } } }),
    ]);
  });

  it('returns the owner of the session, or null', async () => {
    const user = { id: 'u1' };

    await expect(
      repositoryFinding({ user }).repository.findUserByTokenHash('abc', now),
    ).resolves.toBe(user);
    await expect(
      repositoryFinding(null).repository.findUserByTokenHash('abc', now),
    ).resolves.toBeNull();
  });
});
