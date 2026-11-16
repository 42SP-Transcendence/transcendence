import { Module } from '@nestjs/common';
import type { PrismaClient } from '@transcendence/database';

import { PRISMA } from '../../database/database.module';
import { AuthenticateSession } from './application/authenticate-session.use-case';
import { LogIn } from './application/log-in.use-case';
import { LogOut } from './application/log-out.use-case';
import {
  CLOCK,
  type Clock,
  PASSWORD_HASHER,
  type PasswordHasher,
  SESSION_REPOSITORY,
  type SessionRepository,
  USER_REPOSITORY,
  type UserRepository,
} from './application/ports';
import { SignUpUser } from './application/sign-up-user.use-case';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AuthController } from './presentation/auth.controller';
import { SessionGuard } from './presentation/session.guard';

/**
 * Returns the current time.
 */
function systemClock(): Date {
  return new Date();
}

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useFactory: (prisma: PrismaClient) => new PrismaUserRepository(prisma),
      inject: [PRISMA],
    },
    {
      provide: SESSION_REPOSITORY,
      useFactory: (prisma: PrismaClient) => new PrismaSessionRepository(prisma),
      inject: [PRISMA],
    },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: CLOCK, useValue: systemClock },
    {
      provide: SignUpUser,
      useFactory: (users: UserRepository, hasher: PasswordHasher) => new SignUpUser(users, hasher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
    },
    {
      provide: LogIn,
      useFactory: (
        users: UserRepository,
        sessions: SessionRepository,
        hasher: PasswordHasher,
        clock: Clock,
      ) => new LogIn(users, sessions, hasher, clock),
      inject: [USER_REPOSITORY, SESSION_REPOSITORY, PASSWORD_HASHER, CLOCK],
    },
    {
      provide: LogOut,
      useFactory: (sessions: SessionRepository) => new LogOut(sessions),
      inject: [SESSION_REPOSITORY],
    },
    {
      provide: AuthenticateSession,
      useFactory: (sessions: SessionRepository, clock: Clock) =>
        new AuthenticateSession(sessions, clock),
      inject: [SESSION_REPOSITORY, CLOCK],
    },
    SessionGuard,
  ],
  exports: [AuthenticateSession, SessionGuard],
})
export class AuthModule {}
