import { Body, ConflictException, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { type AuthUser, type SignUp, signUpSchema } from '@transcendence/schemas';

import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { SignUpUser } from '../application/sign-up-user.use-case';
import { EmailTakenError } from '../domain/auth-errors';

@Controller('auth')
export class AuthController {
  /**
   * Receives the sign-up use case.
   */
  constructor(@Inject(SignUpUser) private readonly signUpUser: SignUpUser) {}

  /**
   * Creates an account and returns its public profile, or 409 when the e-mail is taken. It does not open a session.
   */
  @Post('signup')
  @HttpCode(201)
  async signUp(@Body(new ZodValidationPipe(signUpSchema)) body: SignUp): Promise<AuthUser> {
    try {
      return await this.signUpUser.execute(body);
    } catch (error) {
      if (error instanceof EmailTakenError) {
        throw new ConflictException({ message: 'email_taken' });
      }
      throw error;
    }
  }
}
