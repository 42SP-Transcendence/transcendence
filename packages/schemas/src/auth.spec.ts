import { signInSchema, signUpSchema } from './auth.js';

const valid = {
  email: '  Pessoa@Exemplo.COM ',
  password: 'senha-bem-longa',
  displayName: '  Ana  ',
};

/**
 * Returns the error codes of a failed parse, keyed by field.
 */
function codes(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}): Record<string, string> {
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]),
  );
}

describe('signUpSchema', () => {
  it('normalizes the email and trims the display name', () => {
    expect(signUpSchema.parse(valid)).toEqual({
      email: 'pessoa@exemplo.com',
      password: 'senha-bem-longa',
      displayName: 'Ana',
    });
  });

  it('keeps the password exactly as typed', () => {
    expect(signUpSchema.parse({ ...valid, password: '  doze chars  ' }).password).toBe(
      '  doze chars  ',
    );
  });

  it('rejects an invalid email, a short password and a short name with stable codes', () => {
    const result = signUpSchema.safeParse({
      email: 'nao-e-email',
      password: 'curta',
      displayName: 'A',
    });

    expect(codes(result)).toEqual({
      email: 'email_invalid',
      password: 'password_too_short',
      displayName: 'display_name_too_short',
    });
  });

  it('rejects passwords longer than the maximum', () => {
    const result = signUpSchema.safeParse({ ...valid, password: 'x'.repeat(129) });

    expect(codes(result)).toEqual({ password: 'password_too_long' });
  });

  it('reports missing fields as required', () => {
    expect(codes(signUpSchema.safeParse({}))).toEqual({
      email: 'email_required',
      password: 'password_required',
      displayName: 'display_name_required',
    });
  });
});

describe('signInSchema', () => {
  it('accepts any non-empty password so old accounts can still sign in', () => {
    expect(signInSchema.parse({ email: 'a@b.co', password: 'x' })).toEqual({
      email: 'a@b.co',
      password: 'x',
    });
  });

  it('rejects an empty password', () => {
    expect(codes(signInSchema.safeParse({ email: 'a@b.co', password: '' }))).toEqual({
      password: 'password_required',
    });
  });
});
