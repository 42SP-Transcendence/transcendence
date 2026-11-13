import { fingerprint } from '../domain/inward';

export const run = (value: string): string => fingerprint(value);
