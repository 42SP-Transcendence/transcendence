import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { CollectorModule } from './collector.module';

/**
 * Starts the collector as a standalone NestJS application context, with no HTTP server.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(CollectorModule);
  app.enableShutdownHooks();
}

void bootstrap();
