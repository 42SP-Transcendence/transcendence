export class OlhoVivoAuthError extends Error {
  /**
   * Signals that the Olho Vivo API refused the token or the session, which retrying cannot fix.
   */
  constructor(message: string) {
    super(message);
    this.name = 'OlhoVivoAuthError';
  }
}

export type OlhoVivoFailure = 'timeout' | 'network' | 'http' | 'invalid_response';

export class OlhoVivoRequestError extends Error {
  /**
   * Describes a failed call: what went wrong, the HTTP status when there was one, and whether it is worth retrying.
   */
  constructor(
    readonly failure: OlhoVivoFailure,
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'OlhoVivoRequestError';
  }
}
