import { createHash, randomBytes } from 'node:crypto';

const SESSION_TOKEN_BYTES = 32;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generates a random 32-byte session token, encoded as base64url for the cookie.
 */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
}

/**
 * Returns the SHA-256 hex digest of a session token, the only form stored in the database.
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
