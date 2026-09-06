import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupTestDb } from '../../setup/db';
import { mockSession } from '../../setup/session';
import { jsonRequest } from '../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let setupRoute: typeof import('@/app/api/setup/route');
let unlockRoute: typeof import('@/app/api/admin/setup-unlock/route');
let dbInit: typeof import('@/lib/db-init');

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  dbInit = await import('@/lib/db-init');
  setupRoute = await import('@/app/api/setup/route');
  unlockRoute = await import('@/app/api/admin/setup-unlock/route');
});

const ADMIN_BODY = {
  name: 'Setup Admin',
  email: 'admin@setup.test',
  password: 'Str0ng!Pass',
};

describe('setup lock lifecycle (REG-16)', () => {
  it('starts unlocked when no users exist', async () => {
    const status = await dbInit.getSetupStatus();
    expect(status.needsSetup).toBe(true);
    expect(status.hasUsers).toBe(false);
  });

  it('POST /api/setup creates the first admin without a session', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(null as never); // no session during setup

    const res = await setupRoute.POST(jsonRequest('http://localhost:3000/api/setup', 'POST', ADMIN_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.role).toBe('admin');
    expect(body.user.email).toBe('admin@setup.test');
  });

  it('locks setup after admin creation', async () => {
    const { appConfig } = await import('@/lib/schema');
    const [config] = await db.select().from(appConfig);
    expect(config.setupComplete).toBe(true);
    expect(await dbInit.isSetupComplete()).toBe(true);
  });

  it('rejects a second admin creation with 409 (REG-16)', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await setupRoute.POST(
      jsonRequest('http://localhost:3000/api/setup', 'POST', {
        name: 'Second Admin',
        email: 'second@setup.test',
        password: 'Str0ng!Pass2',
      })
    );
    expect(res.status).toBe(409);

    const { users } = await import('@/lib/schema');
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
  });

  it('setup-unlock re-opens the bootstrap restore path', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(mockSession({ id: 1, role: 'admin' }) as never);

    const res = await unlockRoute.POST(jsonRequest('http://localhost:3000/api/admin/setup-unlock', 'POST'));
    expect(res.status).toBe(200);
    expect(await dbInit.isSetupComplete()).toBe(false);

    // After unlock, POST /api/setup still refuses (users exist)
    vi.mocked(auth).mockResolvedValue(null as never);
    const second = await setupRoute.POST(
      jsonRequest('http://localhost:3000/api/setup', 'POST', {
        name: 'Third Admin', email: 'third@setup.test', password: 'Str0ng!Pass3',
      })
    );
    expect(second.status).toBe(409);

    // ...but the unauthenticated bootstrap restore (PUT /api/setup) is open.
    // We prove openness by the 400 validation response rather than 401/403.
    const restore = await setupRoute.PUT(jsonRequest('http://localhost:3000/api/setup', 'PUT', { garbage: true }));
    expect(restore.status).toBe(400);
  });

  it('locks setup again after a restore provides users', async () => {
    // Directly flip setupComplete back on (simulating a completed restore)
    const { appConfig } = await import('@/lib/schema');
    await db.update(appConfig).set({ setupComplete: true }).where(eq(appConfig.id, 1));
    expect(await dbInit.isSetupComplete()).toBe(true);

    // Unauthenticated PUT is now rejected
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue(null as never);
    const restore = await setupRoute.PUT(jsonRequest('http://localhost:3000/api/setup', 'PUT', { garbage: true }));
    expect(restore.status).toBe(401);
  });

  it('rejects weak passwords during setup', async () => {
    // Fresh DB behavior: even with users present the validation error is a 400
    // after the hasUsers guard; verify the schema directly instead.
    const { setupAdminSchema } = await import('@/lib/validations');
    expect(setupAdminSchema.safeParse({ ...ADMIN_BODY, password: 'weak' }).success).toBe(false);
  });
});