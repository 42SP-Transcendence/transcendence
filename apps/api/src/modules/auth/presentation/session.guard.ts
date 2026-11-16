import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthUser } from '@transcendence/schemas';

import { AuthenticateSession } from '../application/authenticate-session.use-case';
import { UnauthenticatedError } from '../domain/auth-errors';
import { type CookieRequest, readSessionToken } from './session-cookie';

export type AuthenticatedRequest = CookieRequest & { authUser?: AuthUser };

@Injectable()
export class SessionGuard implements CanActivate {
  /**
   * Receives the use case that resolves a session token into its user.
   */
  constructor(@Inject(AuthenticateSession) private readonly authenticate: AuthenticateSession) {}

  /**
   * Lets the request through only with a valid session, attaching its user; otherwise answers 401 unauthenticated.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    try {
      request.authUser = await this.authenticate.execute(readSessionToken(request));
      return true;
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        throw new UnauthorizedException({ message: 'unauthenticated' });
      }
      throw error;
    }
  }
}
