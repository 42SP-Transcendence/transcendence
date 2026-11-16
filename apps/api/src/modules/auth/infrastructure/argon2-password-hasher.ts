import { hash, verify } from '@node-rs/argon2';

import type { PasswordHasher } from '../application/ports';

export class Argon2PasswordHasher implements PasswordHasher {
  /**
   * Hashes the password with argon2id and a random salt, returning the self-describing PHC string.
   */
  async hash(password: string): Promise<string> {
    return hash(password);
  }

  /**
   * Tells whether the password matches the stored hash, treating a malformed hash as a mismatch.
   */
  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
