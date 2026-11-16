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
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
