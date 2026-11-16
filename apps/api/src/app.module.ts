import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [DatabaseModule, HealthModule, MailModule, AuthModule],
})
export class AppModule {}
