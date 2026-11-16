import { Argon2PasswordHasher } from './argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('hashes with argon2id and never keeps the plaintext', async () => {
    const hash = await hasher.hash('senha-bem-longa');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('senha-bem-longa');
  });

  it('salts every hash, so the same password gives different hashes', async () => {
    const [first, second] = await Promise.all([
      hasher.hash('senha-bem-longa'),
      hasher.hash('senha-bem-longa'),
    ]);

    expect(first).not.toEqual(second);
  });
});
