import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@transcendence/schemas';

import type { AuthenticatedRequest } from './session.guard';

/**
 * Reads the user that SessionGuard attached to the request.
 */
export function currentUserFrom(context: ExecutionContext): AuthUser | undefined {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().authUser;
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  currentUserFrom(context),
);
