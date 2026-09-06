import os from 'os';
import { readdirSync, rmSync, statSync } from 'fs';
import path from 'path';

/**
 * Remove leftover test databases from tmp. Suites delete their own databases
 * in afterAll; this sweep only removes STALE files (older than 1 hour) from
 * crashed runs, so it is safe while other suites are still running in
 * parallel forks.
 */
export function cleanupTestDbs(maxAgeMs = 60 * 60 * 1000): void {
  const tmp = os.tmpdir();
  let entries: string[] = [];
  try {
    entries = readdirSync(tmp);
  } catch {
    return;
  }
  const cutoff = Date.now() - maxAgeMs;
  for (const entry of entries) {
    if (!entry.startsWith('rim-test-')) continue;
    const full = path.join(tmp, entry);
    try {
      const st = statSync(full);
      if (st.isFile() && st.mtimeMs < cutoff) rmSync(full, { force: true });
    } catch {
      // best effort
    }
  }
}

if (require.main === module) {
  cleanupTestDbs();
  console.log('Test databases cleaned up.');
}