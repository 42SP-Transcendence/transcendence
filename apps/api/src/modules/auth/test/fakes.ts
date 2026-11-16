import type {
  NewSession,
  NewUser,
  PasswordHasher,
  SessionRepository,
  StoredUser,
  UserRepository,
} from '../application/ports';
import { EmailTakenError } from '../domain/auth-errors';

export class FakeUserRepository implements UserRepository {
  readonly users: StoredUser[] = [];
  lookupsSeeNothing = false;
  readonly created: NewUser[] = [];
  private sequence = 0;

  /**
   * Returns the stored user with that e-mail, or null, or always null when simulating a concurrent sign-up.
   */
  async findByEmail(email: string): Promise<StoredUser | null> {
    if (this.lookupsSeeNothing) {
      return null;
    }
    return this.users.find((user) => user.email === email) ?? null;
  }

  /**
   * Stores the user like the database would, rejecting a repeated e-mail with EmailTakenError.
   */
  async create(user: NewUser): Promise<StoredUser> {
    this.created.push(user);
    if (this.users.some((stored) => stored.email === user.email)) {
      throw new EmailTakenError();
    }
    this.sequence += 1;
    const stored: StoredUser = {
      id: `00000000-0000-7000-8000-${String(this.sequence).padStart(12, '0')}`,
      email: user.email,
      displayName: user.displayName,
      role: 'user',
      locale: 'pt_BR',
      passwordHash: user.passwordHash,
      suspendedAt: null,
      deletedAt: null,
    };
    this.users.push(stored);
    return stored;
  }
}

export class FakePasswordHasher implements PasswordHasher {
  calls = 0;

  /**
   * Returns a reversible marker instead of a real hash, so tests stay fast.
   */
  async hash(password: string): Promise<string> {
    this.calls += 1;
    return `hashed:${[...password].reverse().join('')}`;
  }

  /**
   * Tells whether the marker was made from that password.
   */
  async verify(passwordHash: string, password: string): Promise<boolean> {
    return passwordHash === `hashed:${[...password].reverse().join('')}`;
  }
}

export class FakeSessionRepository implements SessionRepository {
  readonly sessions: NewSession[] = [];

  /**
   * Receives the user repository that owns the users the sessions point to.
   */
  constructor(private readonly users: FakeUserRepository) {}

  /**
   * Stores the session.
   */
  async create(session: NewSession): Promise<void> {
    this.sessions.push(session);
  }

  /**
   * Returns the owner of an unexpired session with that token hash, or null.
   */
  async findUserByTokenHash(tokenHash: string, now: Date): Promise<StoredUser | null> {
    const session = this.sessions.find(
      (stored) => stored.tokenHash === tokenHash && stored.expiresAt > now,
    );
    return this.users.users.find((user) => user.id === session?.userId) ?? null;
  }

  /**
   * Removes the session with that token hash.
   */
  async deleteByTokenHash(tokenHash: string): Promise<void> {
    const index = this.sessions.findIndex((stored) => stored.tokenHash === tokenHash);
    if (index !== -1) {
      this.sessions.splice(index, 1);
    }
  }
}

export class FakeClock {
  now = new Date('2026-11-16T12:00:00Z');

  /**
   * Returns the clock as a function, the shape the use cases expect.
   */
  readonly read = (): Date => this.now;

  /**
   * Moves the clock forward by the given number of milliseconds.
   */
  advance(ms: number): void {
    this.now = new Date(this.now.getTime() + ms);
  }
}
