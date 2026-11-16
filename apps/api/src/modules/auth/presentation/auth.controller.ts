import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  type AuthUser,
  type SignIn,
  signInSchema,
  type SignUp,
  signUpSchema,
} from '@transcendence/schemas';

import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { LogIn } from '../application/log-in.use-case';
import { LogOut } from '../application/log-out.use-case';
import { SignUpUser } from '../application/sign-up-user.use-case';
import {
  AccountSuspendedError,
  EmailTakenError,
  InvalidCredentialsError,
} from '../domain/auth-errors';
import { CurrentUser } from './current-user.decorator';
import { SessionGuard } from './session.guard';
import {
  type CookieRequest,
  type CookieResponse,
  readSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from './session-cookie';

@Controller('auth')
export class AuthController {
  /**
   * Receives the sign-up, login and logout use cases.
   */
  constructor(
    @Inject(SignUpUser) private readonly signUpUser: SignUpUser,
    @Inject(LogIn) private readonly logIn: LogIn,
    @Inject(LogOut) private readonly logOut: LogOut,
  ) {}

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

  /**
   * Opens a session in an HttpOnly cookie and returns the user, or answers 401 invalid_credentials or 403 account_suspended.
   */
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(signInSchema)) body: SignIn,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<AuthUser> {
    try {
      const session = await this.logIn.execute(body);
      response.cookie(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
      return session.user;
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException({ message: 'invalid_credentials' });
      }
      if (error instanceof AccountSuspendedError) {
        throw new ForbiddenException({ message: 'account_suspended' });
      }
      throw error;
    }
  }

  /**
   * Deletes the current session on the server and clears the cookie, also when there is no session.
   */
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<void> {
    await this.logOut.execute(readSessionToken(request));
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  }

  /**
   * Returns the user of the current session; SessionGuard answers 401 unauthenticated without one.
   */
  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
