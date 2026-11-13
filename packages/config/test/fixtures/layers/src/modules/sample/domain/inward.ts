import { createHash } from 'node:crypto';

export const fingerprint = (value: string): string => createHash('sha256').update(value).digest('hex');
