import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { loadApiEnvOrExit } from './config/env';

/**
 * Validates the environment, then starts the HTTP API under the `/api` prefix on `API_PORT` (default 3001).
 */
async function bootstrap(): Promise<void> {
  const env = loadApiEnvOrExit();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  await app.listen(env.API_PORT);
}

void bootstrap();
