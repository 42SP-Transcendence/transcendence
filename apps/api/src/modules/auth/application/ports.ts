import type { AuthUser } from '@transcendence/schemas';

export type StoredUser = AuthUser & {
  passwordHash: string | null;
  suspendedAt: Date | null;
  deletedAt: Date | null;
};

export interface NewUser {
  email: string;
  displayName: string;
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<StoredUser | null>;
  create(user: NewUser): Promise<StoredUser>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export interface NewSession {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface SessionRepository {
  create(session: NewSession): Promise<void>;
  findUserByTokenHash(tokenHash: string, now: Date): Promise<StoredUser | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
}

export type Clock = () => Date;

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
export const CLOCK = Symbol('CLOCK');
