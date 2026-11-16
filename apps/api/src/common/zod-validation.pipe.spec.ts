import { BadRequestException } from '@nestjs/common';
import { signUpSchema } from '@transcendence/schemas';

import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(signUpSchema);

  it('returns the parsed value from the shared schema', () => {
    expect(
      pipe.transform({ email: 'Ana@Exemplo.com', password: 'senha-bem-longa', displayName: 'Ana' }),
    ).toEqual({ email: 'ana@exemplo.com', password: 'senha-bem-longa', displayName: 'Ana' });
  });

  it('throws 400 with each invalid field and its code', () => {
    try {
      pipe.transform({ email: 'x', password: 'curta', displayName: 'Ana' });
      throw new Error('expected a validation error');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        message: 'validation_failed',
        issues: [
          { field: 'email', code: 'email_invalid' },
          { field: 'password', code: 'password_too_short' },
        ],
      });
    }
  });

  it('never echoes the submitted values back', () => {
    try {
      pipe.transform({ email: 'x', password: 'segredo', displayName: 'Ana' });
    } catch (error) {
      expect(JSON.stringify((error as BadRequestException).getResponse())).not.toContain('segredo');
    }
  });
});
