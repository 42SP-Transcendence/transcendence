import { generateSessionToken, hashSessionToken } from './session-token';

describe('session token', () => {
  it('generates 32 random bytes encoded as base64url', () => {
    const token = generateSessionToken();

    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generateSessionToken()).not.toEqual(token);
  });

  it('hashes with SHA-256 and never returns the token itself', () => {
    const token = generateSessionToken();

    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).toEqual(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toContain(token);
  });
});
