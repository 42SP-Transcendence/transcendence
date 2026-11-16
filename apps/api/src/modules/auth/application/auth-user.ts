import type { AuthUser } from '@transcendence/schemas';

import type { StoredUser } from './ports';

/**
 * Keeps only the public fields of a stored user, so the password hash never leaves the api.
 */
export function toAuthUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    locale: user.locale,
  };
}
