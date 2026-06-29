/**
 * Global teardown — clean up any leftover test sqlite files.
 */
import { readdirSync, rmSync } from 'node:fs';

export async function teardown() {
  try {
    for (const f of readdirSync('.')) {
      if (/^sqlite\.test\..*\.db/.test(f) || /^sqlite\.e2e\.db/.test(f)) {
        try { rmSync(f); } catch { /* ignore */ }
      }
    }
  } catch {
    // ignore
  }
}

export default teardown;