import type { PrismaClient } from '@transcendence/database';

import type { NewSession, SessionRepository, StoredUser } from '../application/ports';
import { STORED_USER_FIELDS } from './prisma-user.repository';

export class PrismaSessionRepository implements SessionRepository {
  /**
   * Receives the shared Prisma client.
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Stores a new session row.
   */
  async create(session: NewSession): Promise<void> {
    await this.prisma.session.create({ data: session });
  }

  /**
   * Returns the owner of an unexpired session with that token hash, or null.
   */
  async findUserByTokenHash(tokenHash: string, now: Date): Promise<StoredUser | null> {
    const session = await this.prisma.session.findFirst({
      where: { tokenHash, expiresAt: { gt: now } },
      select: { user: { select: STORED_USER_FIELDS } },
    });
    return session?.user ?? null;
  }

  /**
   * Deletes the session with that token hash, if any.
   */
  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }
}
