# Resell Inventory Manager — Operational Runbook

> **Version:** 2.0  
> **Date:** 2026-06-12  
> **Purpose:** Operational reference for deploying, configuring, monitoring, and troubleshooting the application.

---

## 1. Deployment

### 1.1 Prerequisites

- Docker Engine 24+ and Docker Compose v2+
- TLS certificates (production: Cloudflare Origin CA; UAT: self-signed)
- `AUTH_SECRET` environment variable (generate with `./scripts/generate-secret.sh`)

### 1.2 Production Deployment (HTTPS)

```bash
# 1. Generate AUTH_SECRET
./scripts/generate-secret.sh

# 2. Place production TLS certificate
mkdir -p certs
cp /path/to/origin-ca.pem certs/prod.pem
cp /path/to/origin-ca-key.pem certs/prod.key

# 3. Create .env.local with secrets
cat > .env.local << EOF
AUTH_SECRET=<generated-secret>
AUTH_URL=https://your-domain.com
TLS_CERT=/data/certs/prod.pem
TLS_KEY=/data/certs/prod.key
EOF

# 4. Start services
docker compose --profile https up -d

# 5. Verify
curl -k https://localhost/api/health
```

### 1.3 Development Mode (No HTTPS)

```bash
npm install
npx drizzle-kit generate
npx drizzle-kit migrate
npm run dev
# Access via http://localhost:3000
```

### 1.4 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_SECRET` | **Yes** | — | JWT signing key. Generate with `openssl rand -base64 32` |
| `AUTH_URL` | No | `https://inventory.cosmiccatvintage.com` | NextAuth base URL. Must match your domain. |
| `NODE_ENV` | No | `development` | Set to `production` in Docker. |
| `DATABASE_PATH` | No | `sqlite.db` | SQLite database path (dev only; production uses `/data/sqlite.db`) |
| `UPLOADS_PATH` | No | `uploads` | Photo uploads directory (dev only; production uses `/data/uploads`) |
| `BACKUPS_PATH` | No | `backups` | Backup directory (dev only; production uses `/data/backups`) |
| `COOKIE_SECURE` | No | `true` in production | Set to `false` for HTTP-only dev |

> **Removed from v1:** `TRUSTED_PROXIES` — rate limiting is handled by Caddy, not the application.

### 1.5 Production Paths (Hardcoded)

| Resource | Path |
|----------|------|
| SQLite database | `/data/sqlite.db` |
| Photo uploads | `/data/uploads/items/{itemId}/{uuid}.{ext}` |
| Backups | `/data/backups/sqlite_YYYYMMDD_HHMMSS.db.gz` |

### 1.6 Container Architecture

```
┌─────────────────────────────────────────┐
│  Docker Compose                          │
│                                          │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │  app          │  │  caddy           │ │
│  │  Port: 3000   │  │  Ports: 80, 443, │ │
│  │  read_only:   │  │    8443          │ │
│  │    true       │  │  Rate limiting:  │ │
│  │  tmpfs: /tmp  │  │    5/15min auth  │ │
│  │  volume:      │  │    100/15min api │ │
│  │   ./data:/data│  └──────────────────┘ │
│  └──────────────┘                        │
│                                          │
│  Network: frontend (172.28.0.0/16)       │
└─────────────────────────────────────────┘
```

---

## 2. Initial Setup

### 2.1 First-Time Setup Flow

1. Navigate to `https://your-domain.com` → redirected to `/setup`
2. Choose "Create New Database" or "Restore from Backup"
3. If creating new: fill in name, email, password (meets requirements)
4. On success: redirected to `/login`
5. Login with the admin credentials
6. Setup endpoint locked via `app_config.setup_complete = true`

---

## 3. Backup & Recovery

### 3.1 Automated Backups (Cron)

```bash
# Run daily at 2 AM
0 2 * * * /data/backups/backup.sh
```

### 3.2 Manual Backup (API)

```bash
curl -s -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  https://your-domain.com/api/admin/backup \
  -o backup-$(date +%Y%m%d).json
```

### 3.3 Restore from Backup

**Via Admin UI:** Admin → Settings → Restore from Backup

**Via API:**
```bash
curl -X POST https://your-domain.com/api/admin/restore \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Origin: https://your-domain.com" \
  -H "Content-Type: application/json" \
  -d @backup.json
```

**Via Setup Page:** Available during initial setup when no users exist.

Restore behavior: All rows validated against Zod schemas before any DB changes. If any row fails validation, the entire restore is aborted.

### 3.4 Database Recovery from File Backup

```bash
docker compose down
cp /data/backups/sqlite_20260612_020000.db.gz /tmp/
gunzip /tmp/sqlite_20260612_020000.db.gz
cp /tmp/sqlite_20260612_020000.db /data/sqlite.db
docker compose up -d
```

### 3.5 Data Integrity Check

```bash
docker compose exec app sqlite3 /data/sqlite.db "PRAGMA integrity_check;"
docker compose exec app sqlite3 /data/sqlite.db "PRAGMA foreign_key_check;"
```

---

## 4. Monitoring & Health

### 4.1 Health Check Endpoint

```bash
curl https://your-domain.com/api/health
# Response: {"status":"ok","timestamp":"2026-06-12T10:30:00.000Z"}
```

### 4.2 Application Logs

```bash
docker compose logs -f app
docker compose logs -f caddy
docker compose logs -f
```

### 4.3 Key Metrics to Monitor

| Metric | How to Check | Alert Threshold |
|--------|-------------|-----------------|
| Health check | `GET /api/health` | Non-200 status |
| Database size | `ls -lh /data/sqlite.db` | > 1GB |
| Upload directory size | `du -sh /data/uploads/` | > 500MB |
| Backup age | `ls -lt /data/backups/` | No backup in 48h |
| Container restarts | `docker compose ps` | > 3 restarts in 1h |
| Disk space | `df -h /data` | > 90% usage |
| Rate limiting | Caddy access logs | 429 responses in logs |

---

## 5. Troubleshooting

### 5.1 Common Issues

#### Application Won't Start

```bash
docker compose logs app | grep "Migration error"
docker compose exec app sqlite3 /data/sqlite.db "PRAGMA integrity_check;"
ls -la /data/
```

#### Login Fails After Backup Restore

- Verify admin user exists: `docker compose exec app sqlite3 /data/sqlite.db "SELECT id, email, role FROM users WHERE role='admin';"`
- Reset admin password: `npx tsx src/scripts/seed.ts`
- Or update directly: `docker compose exec app sqlite3 /data/sqlite.db "UPDATE users SET password_changed_at = 0 WHERE email='admin@example.com';"`

#### Origin/Referer Errors (CSRF)

- Ensure the `AUTH_URL` environment variable matches your domain exactly.
- If using a reverse proxy in front of Caddy, ensure `X-Forwarded-Host` or `Host` headers are preserved.
- Browsers automatically send `Origin` headers on `fetch()` requests — no manual intervention needed.

#### Rate Limiting Issues

- Caddy rate limits auth endpoints at 5 requests per 15 minutes per IP.
- If legitimate users are locked out: check Caddy logs for 429 responses.
- Adjust limits in `Caddyfile` `rate_limit` block.

#### Photo Uploads Not Working

```bash
ls -la /data/uploads/
chown -R 1001:1001 /data/uploads/  # Fix permissions if needed
```

#### Session Invalidation After Password Change

- When a user changes their password, `password_changed_at` is updated.
- All existing JWTs with `iat < password_changed_at` are automatically rejected.
- This is the expected behavior — the user should log in again.

### 5.2 Reset Procedures

#### Reset Setup Lock

```bash
# Via API
curl -X POST https://your-domain.com/api/admin/setup-unlock \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Origin: https://your-domain.com"

# Or directly in database
docker compose exec app sqlite3 /data/sqlite.db \
  "UPDATE app_config SET setup_complete = 0 WHERE id = 1;"
```

#### Invalidate All Sessions for a User

```bash
# Via Admin UI: Reset the user's password
# This automatically updates password_changed_at, invalidating all sessions

# Or directly in database
docker compose exec app sqlite3 /data/sqlite.db \
  "UPDATE users SET password_changed_at = <current_timestamp> WHERE id = <user_id>;"
```

Note: Unlike v1, there is no `revoked_tokens` table. Session invalidation is done by updating `password_changed_at`.

#### Rotate AUTH_SECRET

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Update .env.local or docker-compose.yml
# AUTH_SECRET=$NEW_SECRET

# 3. Restart
docker compose down && docker compose --profile https up -d

# All existing sessions are invalidated
```

---

## 6. Upgrades & Migrations

### 6.1 Application Upgrade

```bash
# 1. Backup
cp /data/sqlite.db /data/backups/sqlite_pre_upgrade_$(date +%Y%m%d).db

# 2. Pull new code
git pull

# 3. Rebuild and restart
docker compose down
docker compose --profile https build
docker compose --profile https up -d

# 4. Verify
curl -k https://localhost/api/health
docker compose logs app | grep "Applying migration"
```

### 6.2 Database Schema Changes

```bash
npx drizzle-kit generate    # Generate migration from schema changes
npx drizzle-kit migrate     # Apply in development
# In production, migrations run automatically on container startup
```

### 6.3 V1 to V2 Migration

The v1→v2 migration involves these database changes:
1. Add `can_view_all` column to `users` (INTEGER DEFAULT 0)
2. Add `password_changed_at` column to `users` (INTEGER DEFAULT 0)
3. Update all `power_user` role values to `user` and set `can_view_all = 1`
4. Remove `failed_login_attempts` and `locked_until` columns from `users`
5. Create `app_config` table from `settings` key-value data
6. Drop `settings`, `revoked_tokens`, `sessions`, `accounts`, `verification_tokens` tables

---

## 7. Security Operations

### 7.1 Certificate Renewal

**Production (Cloudflare Origin CA):**
1. Obtain new certificate from Cloudflare dashboard
2. Replace `certs/prod.pem` and `certs/prod.key`
3. Restart Caddy: `docker compose restart caddy`

**UAT (Self-signed):**
```bash
./scripts/generate-self-signed-cert.sh
docker compose restart caddy
```

### 7.2 Rate Limiting

Rate limiting is configured in the `Caddyfile`:
- `auth_zone`: 5 requests per 15 minutes per IP (for `/api/auth/*`)
- `api_zone`: 100 requests per 15 minutes per IP (for all other mutations)

To adjust limits, edit the `Caddyfile` and restart Caddy:
```bash
docker compose restart caddy
```

### 7.3 Audit Trail

The application tracks:
- User creation: `created_by` column in users table
- Last login: `last_login` column
- Password changes: `password_changed_at` column (also invalidates sessions)
- Setup completion: `setup_complete` in `app_config` table

No centralized application log exists. Security events are logged to stdout (`docker compose logs`).

---

## 8. Scaling Considerations

### 8.1 Current Limitations

- **Single instance only:** SQLite supports one writer at a time.
- **No WebSocket support:** Uses polling/refetch.
- **No file upload replication:** Photos stored on local filesystem.

### 8.2 Scaling Path (If Needed)

1. **Database:** Migrate from SQLite to PostgreSQL with Drizzle ORM (minimal code changes).
2. **File storage:** Migrate from local filesystem to S3-compatible object storage.
3. **Session storage:** Already JWT-based — no changes needed for multi-instance.

Note: Kubernetes manifests are **not provided** for this application because SQLite, local file storage, and the single-writer constraint make horizontal scaling impractical. Docker Compose is the recommended deployment method.