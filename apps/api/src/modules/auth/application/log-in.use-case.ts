import type { AuthUser, SignIn } from '@transcendence/schemas';

import { AccountSuspendedError, InvalidCredentialsError } from '../domain/auth-errors';
import { generateSessionToken, hashSessionToken, SESSION_TTL_MS } from '../domain/session-token';
import { toAuthUser } from './auth-user';
import type { Clock, PasswordHasher, SessionRepository, UserRepository } from './ports';

export interface OpenedSession {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}

export class LogIn {
  /**
   * Receives the user and session repositories, the password hasher and the clock.
   */
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  /**
   * Checks the credentials and opens a new session, storing only the hash of its token.
   */
  async execute(input: SignIn): Promise<OpenedSession> {
    const user = await this.users.findByEmail(input.email);
    if (!user || user.deletedAt || !user.passwordHash) {
      await this.hasher.hash(input.password);
      throw new InvalidCredentialsError();
    }
    if (!(await this.hasher.verify(user.passwordHash, input.password))) {
      throw new InvalidCredentialsError();
    }
    if (user.suspendedAt) {
      throw new AccountSuspendedError();
    }
    const token = generateSessionToken();
    const expiresAt = new Date(this.clock().getTime() + SESSION_TTL_MS);
    await this.sessions.create({ userId: user.id, tokenHash: hashSessionToken(token), expiresAt });
    return { user: toAuthUser(user), token, expiresAt };
  }
}
