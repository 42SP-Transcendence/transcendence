import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { z } from '@transcendence/schemas';

interface ValidationIssue {
  field: string;
  code: string;
}

export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  /**
   * Binds the pipe to the shared schema that validates the incoming value.
   */
  constructor(private readonly schema: T) {}

  /**
   * Returns the parsed value, or throws a 400 listing each invalid field with its error code.
   */
  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }
    const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      code: issue.message,
    }));
    throw new BadRequestException({ message: 'validation_failed', issues });
  }
}
