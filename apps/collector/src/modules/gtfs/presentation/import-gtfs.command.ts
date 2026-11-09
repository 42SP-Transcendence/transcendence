import 'reflect-metadata';

import { resolve } from 'node:path';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { DatabaseModule } from '../../../database/database.module';
import { ImportGtfs } from '../application/import-gtfs.use-case';
import { GtfsModule } from '../gtfs.module';
import { DirectoryGtfsSource } from '../infrastructure/directory-gtfs-source';
import { formatImportReport } from './import-report';

@Module({ imports: [DatabaseModule, GtfsModule] })
class ImportGtfsCommandModule {}

/**
 * Imports the GTFS folder given on the command line and prints the report, exiting with 1 when the feed is rejected.
 */
async function main(): Promise<void> {
  const [directory] = process.argv.slice(2);
  if (!directory) {
    console.error('Usage: pnpm gtfs:import <folder with the GTFS .txt files>');
    process.exitCode = 2;
    return;
  }
  const app = await NestFactory.createApplicationContext(ImportGtfsCommandModule, {
    logger: ['error', 'warn'],
  });
  try {
    const source = new DirectoryGtfsSource(
      resolve(process.env.INIT_CWD ?? process.cwd(), directory),
    );
    const report = await app.get(ImportGtfs).execute(source);
    console.log(formatImportReport(report));
    if (report.status === 'rejected') {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

void main();
