import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [DatabaseModule, HealthModule, MailModule],
})
export class AppModule {}
