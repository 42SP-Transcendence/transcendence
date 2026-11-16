export class EmailTakenError extends Error {
  /**
   * Signals that another account already uses the requested e-mail.
   */
  constructor() {
    super('email_taken');
    this.name = 'EmailTakenError';
  }
}
