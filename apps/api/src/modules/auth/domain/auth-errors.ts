export class EmailTakenError extends Error {
  /**
   * Signals that another account already uses the requested e-mail.
   */
  constructor() {
    super('email_taken');
    this.name = 'EmailTakenError';
  }
}

export class InvalidCredentialsError extends Error {
  /**
   * Signals a login with an unknown e-mail or a wrong password, without telling which one.
   */
  constructor() {
    super('invalid_credentials');
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountSuspendedError extends Error {
  /**
   * Signals a correct login on an account that a moderator suspended.
   */
  constructor() {
    super('account_suspended');
    this.name = 'AccountSuspendedError';
  }
}

export class UnauthenticatedError extends Error {
  /**
   * Signals a request without a valid session: missing, unknown, expired, or owned by a suspended account.
   */
  constructor() {
    super('unauthenticated');
    this.name = 'UnauthenticatedError';
  }
}
