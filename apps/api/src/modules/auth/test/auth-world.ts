import { AuthenticateSession } from '../application/authenticate-session.use-case';
import { LogIn } from '../application/log-in.use-case';
import { LogOut } from '../application/log-out.use-case';
import { SignUpUser } from '../application/sign-up-user.use-case';
import { FakeClock, FakePasswordHasher, FakeSessionRepository, FakeUserRepository } from './fakes';

export const PASSWORD = 'senha-bem-longa';

export interface AuthWorld {
  users: FakeUserRepository;
  sessions: FakeSessionRepository;
  hasher: FakePasswordHasher;
  clock: FakeClock;
  signUp: SignUpUser;
  logIn: LogIn;
  logOut: LogOut;
  authenticate: AuthenticateSession;
  register(email: string): Promise<string>;
}

/**
 * Wires every auth use case over shared in-memory fakes, with a helper that signs up a user and returns its id.
 */
export function authWorld(): AuthWorld {
  const users = new FakeUserRepository();
  const sessions = new FakeSessionRepository(users);
  const hasher = new FakePasswordHasher();
  const clock = new FakeClock();
  const signUp = new SignUpUser(users, hasher);
  return {
    users,
    sessions,
    hasher,
    clock,
    signUp,
    logIn: new LogIn(users, sessions, hasher, clock.read),
    logOut: new LogOut(sessions),
    authenticate: new AuthenticateSession(sessions, clock.read),
    register: async (email) =>
      (await signUp.execute({ email, password: PASSWORD, displayName: 'Pessoa' })).id,
  };
}

/**
 * Marks the stored user as suspended now.
 */
export function suspend(world: AuthWorld, userId: string): void {
  const user = world.users.users.find((stored) => stored.id === userId);
  if (user) {
    user.suspendedAt = world.clock.now;
  }
}
