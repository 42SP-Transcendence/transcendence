import type { AuthUser } from '@transcendence/schemas';

import { UnauthenticatedError } from '../domain/auth-errors';
import { hashSessionToken } from '../domain/session-token';
import { toAuthUser } from './auth-user';
import type { Clock, SessionRepository } from './ports';

export class AuthenticateSession {
  /**
   * Receives the session repository and the clock.
   */
  constructor(
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * Resolves the user behind a session token, rejecting a missing, unknown or expired token and suspended or deleted accounts.
   */
  async execute(token: string | undefined): Promise<AuthUser> {
    if (!token) {
      throw new UnauthenticatedError();
    }
    const user = await this.sessions.findUserByTokenHash(hashSessionToken(token), this.clock());
    if (!user || user.suspendedAt || user.deletedAt) {
      throw new UnauthenticatedError();
    }
    return toAuthUser(user);
  }
}
