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

describe('Argon2PasswordHasher.verify', () => {
  const hasher = new Argon2PasswordHasher();

  it('accepts the right password and rejects a wrong one', async () => {
    const hash = await hasher.hash('senha-bem-longa');

    await expect(hasher.verify(hash, 'senha-bem-longa')).resolves.toBe(true);
    await expect(hasher.verify(hash, 'senha-errada-aqui')).resolves.toBe(false);
  });

  it('treats a malformed hash as a mismatch', async () => {
    await expect(hasher.verify('nao-e-um-hash', 'senha-bem-longa')).resolves.toBe(false);
  });
});
