import type { AuthUser, SignUp } from '@transcendence/schemas';

import { EmailTakenError } from '../domain/auth-errors';
import { toAuthUser } from './auth-user';
import type { PasswordHasher, UserRepository } from './ports';

export class SignUpUser {
  /**
   * Receives the user repository and the password hasher.
   */
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  /**
   * Creates an account with a hashed password, failing with EmailTakenError when the e-mail is already in use.
   */
  async execute(input: SignUp): Promise<AuthUser> {
    if (await this.users.findByEmail(input.email)) {
      throw new EmailTakenError();
    }
    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    });
    return toAuthUser(user);
  }
}
