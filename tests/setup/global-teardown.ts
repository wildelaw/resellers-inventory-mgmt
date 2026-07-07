import { cleanupTestDb } from './db';

export function teardown() {
  cleanupTestDb();
}
