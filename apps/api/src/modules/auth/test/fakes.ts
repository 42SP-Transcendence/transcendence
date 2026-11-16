import type { NewUser, PasswordHasher, StoredUser, UserRepository } from '../application/ports';
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
    return `hashed:${password.length}`;
  }
}
