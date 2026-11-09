import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { GtfsSource } from '../application/ports';
import type { GtfsFile } from '../domain/schedule';

export class DirectoryGtfsSource implements GtfsSource {
  /**
   * Receives the folder that holds the extracted GTFS .txt files.
   */
  constructor(private readonly directory: string) {}

  /**
   * Reads one GTFS file as UTF-8, returning undefined when the folder does not have it.
   */
  async read(file: GtfsFile): Promise<string | undefined> {
    try {
      return await readFile(join(this.directory, `${file}.txt`), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined;
      }
      throw error;
    }
  }
}
