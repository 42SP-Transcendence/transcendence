import { hashSessionToken } from '../domain/session-token';
import type { SessionRepository } from './ports';

export class LogOut {
  /**
   * Receives the session repository.
   */
  constructor(private readonly sessions: SessionRepository) {}

  /**
   * Deletes the session behind the token, doing nothing when there is no token or no such session.
   */
  async execute(token: string | undefined): Promise<void> {
    if (token) {
      await this.sessions.deleteByTokenHash(hashSessionToken(token));
    }
  }
}
