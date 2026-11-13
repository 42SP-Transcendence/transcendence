export type CircuitBreakerOptions = {
  failureThreshold: number;
  openMs: number;
  now?: () => number;
};

export class CircuitOpenError extends Error {
  /**
   * Signals that the circuit is open and the call was refused without reaching the remote service.
   */
  constructor(readonly retryInMs: number) {
    super(`circuit open, next attempt in ${Math.ceil(retryInMs / 1000)} s`);
    this.name = 'CircuitOpenError';
  }
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | undefined;
  private trialRunning = false;
  private readonly now: () => number;

  /**
   * Receives how many consecutive failures open the circuit and how long it stays open before a trial call.
   */
  constructor(private readonly options: CircuitBreakerOptions) {
    this.now = options.now ?? Date.now;
  }

  /**
   * Reports closed, open, or half-open when the open period is over and the next call is a trial.
   */
  get state(): 'closed' | 'open' | 'half_open' {
    if (this.openedAt === undefined) {
      return 'closed';
    }
    return this.now() - this.openedAt >= this.options.openMs ? 'half_open' : 'open';
  }

  /**
   * Runs the action unless the circuit is open, counting only the errors the caller marks as outages.
   */
  async run<T>(action: () => Promise<T>, isOutage: (error: unknown) => boolean): Promise<T> {
    if (this.openedAt !== undefined) {
      const elapsed = this.now() - this.openedAt;
      if (elapsed < this.options.openMs || this.trialRunning) {
        throw new CircuitOpenError(Math.max(this.options.openMs - elapsed, 0));
      }
    }
    const trial = this.openedAt !== undefined;
    if (trial) {
      this.trialRunning = true;
    }
    try {
      const result = await action();
      this.close();
      return result;
    } catch (error) {
      if (isOutage(error)) {
        this.failures++;
        if (trial || this.failures >= this.options.failureThreshold) {
          this.openedAt = this.now();
        }
      } else if (trial) {
        this.close();
      }
      throw error;
    } finally {
      if (trial) {
        this.trialRunning = false;
      }
    }
  }

  /**
   * Forgets past failures and lets every call through again.
   */
  private close(): void {
    this.failures = 0;
    this.openedAt = undefined;
  }
}
