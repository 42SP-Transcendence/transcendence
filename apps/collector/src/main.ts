import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { CollectorModule } from './collector.module';
import { loadCollectorEnv, orExit } from './config/env';

/**
 * Validates the environment, then starts the collector as a standalone NestJS application context, with no HTTP server.
 */
async function bootstrap(): Promise<void> {
  orExit(() => loadCollectorEnv());
  const app = await NestFactory.createApplicationContext(CollectorModule);
  app.enableShutdownHooks();
}

void bootstrap();
