import { ConflictException } from '@nestjs/common';

import { SignUpUser } from '../application/sign-up-user.use-case';
import { FakePasswordHasher, FakeUserRepository } from '../test/fakes';
import { AuthController } from './auth.controller';

const body = { email: 'ana@exemplo.com', password: 'senha-bem-longa', displayName: 'Ana' };

describe('AuthController', () => {
  /**
   * Builds the controller over in-memory fakes.
   */
  function controller(): AuthController {
    return new AuthController(new SignUpUser(new FakeUserRepository(), new FakePasswordHasher()));
  }

  it('returns the public profile on sign-up', async () => {
    await expect(controller().signUp(body)).resolves.toMatchObject({
      email: 'ana@exemplo.com',
      displayName: 'Ana',
    });
  });

  it('answers 409 email_taken for a repeated e-mail', async () => {
    const auth = controller();
    await auth.signUp(body);

    const error = await auth.signUp(body).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toEqual({ message: 'email_taken' });
  });
});
