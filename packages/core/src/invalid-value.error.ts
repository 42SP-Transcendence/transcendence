export class InvalidValueError extends Error {
  /**
   * Signals that a value object was built from a value that breaks its rules.
   */
  constructor(message: string) {
    super(message);
    this.name = 'InvalidValueError';
  }
}
