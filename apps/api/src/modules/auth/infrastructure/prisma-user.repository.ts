import type { PrismaClient } from '@transcendence/database';

import type { NewUser, StoredUser, UserRepository } from '../application/ports';
import { EmailTakenError } from '../domain/auth-errors';

const STORED_USER_FIELDS = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  locale: true,
  passwordHash: true,
  suspendedAt: true,
  deletedAt: true,
} as const;

/**
 * Tells whether a Prisma error is a unique constraint violation.
 */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

export class PrismaUserRepository implements UserRepository {
  /**
   * Receives the shared Prisma client.
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Finds the user that owns the e-mail, or null when there is none.
   */
  async findByEmail(email: string): Promise<StoredUser | null> {
    return this.prisma.user.findUnique({ where: { email }, select: STORED_USER_FIELDS });
  }

  /**
   * Inserts the user, turning a unique violation on the e-mail into EmailTakenError for concurrent sign-ups.
   */
  async create(user: NewUser): Promise<StoredUser> {
    try {
      return await this.prisma.user.create({ data: user, select: STORED_USER_FIELDS });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailTakenError();
      }
      throw error;
    }
  }
}
