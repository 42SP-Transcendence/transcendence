import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';

const outage = new Error('outage');
const refused = new Error('refused');

/**
 * Treats only the outage error as a failure that counts toward opening the circuit.
 */
function isOutage(error: unknown): boolean {
  return error === outage;
}

/**
 * Builds a breaker that opens after two outages and stays open for one minute of fake time.
 */
function breaker() {
  const clock = { now: 0 };
  const instance = new CircuitBreaker({
    failureThreshold: 2,
    openMs: 60_000,
    now: () => clock.now,
  });
  return { instance, clock };
}

describe('CircuitBreaker', () => {
  it('opens after consecutive outages and refuses calls while open', async () => {
    const { instance } = breaker();
    let calls = 0;
    const action = async () => {
      calls++;
      throw outage;
    };

    await expect(instance.run(action, isOutage)).rejects.toBe(outage);
    await expect(instance.run(action, isOutage)).rejects.toBe(outage);
    await expect(instance.run(action, isOutage)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(calls).toBe(2);
    expect(instance.state).toBe('open');
  });

  it('resets the count after a success', async () => {
    const { instance } = breaker();

    await expect(instance.run(async () => Promise.reject(outage), isOutage)).rejects.toBe(outage);
    await instance.run(async () => 'ok', isOutage);
    await expect(instance.run(async () => Promise.reject(outage), isOutage)).rejects.toBe(outage);

    expect(instance.state).toBe('closed');
  });

  it('ignores errors that are not outages', async () => {
    const { instance } = breaker();

    for (let i = 0; i < 3; i++) {
      await expect(instance.run(async () => Promise.reject(refused), isOutage)).rejects.toBe(
        refused,
      );
    }

    expect(instance.state).toBe('closed');
  });

  it('lets one trial call through after the open period and reopens if it fails', async () => {
    const { instance, clock } = breaker();
    for (let i = 0; i < 2; i++) {
      await expect(instance.run(async () => Promise.reject(outage), isOutage)).rejects.toBe(outage);
    }

    clock.now = 60_000;
    expect(instance.state).toBe('half_open');
    await expect(instance.run(async () => Promise.reject(outage), isOutage)).rejects.toBe(outage);
    expect(instance.state).toBe('open');

    clock.now = 120_000;
    await expect(instance.run(async () => 'ok', isOutage)).resolves.toBe('ok');
    expect(instance.state).toBe('closed');
  });

  it('refuses a second call while the trial is still running', async () => {
    const { instance, clock } = breaker();
    for (let i = 0; i < 2; i++) {
      await expect(instance.run(async () => Promise.reject(outage), isOutage)).rejects.toBe(outage);
    }
    clock.now = 60_000;
    let finishTrial: (value: string) => void = () => undefined;
    const trial = instance.run(
      () => new Promise<string>((resolve) => (finishTrial = resolve)),
      isOutage,
    );

    await expect(instance.run(async () => 'second', isOutage)).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
    finishTrial('first');
    await expect(trial).resolves.toBe('first');
  });
});
