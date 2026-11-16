import { Module } from '@nestjs/common';
import type { PrismaClient } from '@transcendence/database';

import { PRISMA } from '../../database/database.module';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
  USER_REPOSITORY,
  type UserRepository,
} from './application/ports';
import { SignUpUser } from './application/sign-up-user.use-case';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AuthController } from './presentation/auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useFactory: (prisma: PrismaClient) => new PrismaUserRepository(prisma),
      inject: [PRISMA],
    },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    {
      provide: SignUpUser,
      useFactory: (users: UserRepository, hasher: PasswordHasher) => new SignUpUser(users, hasher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
    },
  ],
})
export class AuthModule {}
