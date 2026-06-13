# Resell Inventory Manager — API Reference

> **Version:** 2.0  
> **Date:** 2026-06-12  
> **Purpose:** Complete and authoritative API reference for all endpoints.

---

## Conventions

### Authentication
All endpoints except `/api/health`, `/api/setup` (GET/POST), and `/api/auth/*` require a valid NextAuth JWT session cookie.

### CSRF Protection
All state-changing requests (POST, PUT, DELETE, PATCH) must have a matching `Origin` or `Referer` header. The server validates that the origin matches the configured `AUTH_URL`. Browsers send `Origin` automatically on fetch requests. No CSRF token is required.

### Rate Limiting
Rate limiting is handled by the Caddy reverse proxy:
- Auth endpoints: 5 requests per IP per 15-minute window
- API mutations: 100 requests per IP per 15-minute window

### Pagination
List endpoints support `page` (default 1) and `pageSize` (default 20, max 100) query parameters. Response format:
```json
{
  "items": [...],
  "pagination": { "page": 1, "pageSize": 20, "total": 100, "totalPages": 5 }
}
```

### Error Responses
All errors return JSON:
```json
{ "error": "Error message", "code": "ERROR_CODE" }
```
| Status | Code | Meaning |
|--------|------|---------|
| 400 | BAD_REQUEST | Validation failure or malformed input |
| 401 | UNAUTHORIZED | Not authenticated or session invalidated |
| 403 | FORBIDDEN | Insufficient permissions |
| 403 | INVALID_ORIGIN | Origin/Referer header mismatch (CSRF) |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Duplicate resource |
| 429 | — | Rate limited (from Caddy) |

---

## Authentication

### NextAuth Login
```
POST /api/auth/callback/credentials
Content-Type: application/x-www-form-urlencoded

email=user@example.com&password=password123
```
Handled by NextAuth. Returns session cookie on success. Rate limited at Caddy level (5 requests/15 min per IP).

### Check Setup Status
```
GET /api/setup
Auth: None
```
**Response 200:**
```json
{ "needsSetup": false, "hasUsers": true }
```

### Create Initial Admin
```
POST /api/setup
Auth: None (only when needsSetup=true and not locked)
Origin: Required
```
**Request:**
```json
{ "name": "Admin", "email": "admin@example.com", "password": "SecureP@ss1" }
```
**Response 201:**
```json
{ "message": "Admin account created", "user": { "id": "1", "email": "admin@example.com", "name": "Admin", "role": "admin" } }
```
Password requirements: 8+ chars, uppercase, lowercase, digit, special character.

### Restore from Backup (Setup)
```
PUT /api/setup
Auth: Admin
Origin: Required
```
Same as `POST /api/admin/restore` but accessible during initial setup.

### Health Check
```
GET /api/health
Auth: None
```
**Response 200:**
```json
{ "status": "ok", "timestamp": "2026-06-12T10:30:00.000Z" }
```

---

## Inventory

### List Items
```
GET /api/inventory?page=1&pageSize=20&status=available&category=Electronics&search=jacket&startDate=2024-01-01&endDate=2024-12-31&sortBy=purchaseDate&sortOrder=desc
Auth: Required (user sees own items; admin/canViewAll sees all)
```
**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| pageSize | int | 20 | Items per page (max 100) |
| status | string | — | Filter by item status |
| category | string | — | Filter by category |
| search | string | — | Search name, description, location |
| startDate | date | — | Filter purchase date ≥ |
| endDate | date | — | Filter purchase date ≤ |
| sortBy | string | createdAt | Sort field |
| sortOrder | string | desc | Sort order: asc or desc |

**Response 200:**
```json
{
  "items": [
    {
      "id": 1, "name": "Vintage Jacket", "description": "Denim",
      "purchaseDate": "2024-01-15T00:00:00.000Z", "purchasePrice": 25.00,
      "purchaseLocation": "Goodwill", "category": "Clothing",
      "status": "available", "notes": null, "removalDate": null,
      "metadata": null, "ownerId": 1,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      "photos": [{ "id": 1, "itemId": 1, "filename": "photo.jpg", "path": "/items/1/uuid.jpg", "isPrimary": 1, "createdAt": "..." }],
      "sales": []
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 100, "totalPages": 5 },
  "categories": ["Clothing", "Electronics"]
}
```

### Get Single Item
```
GET /api/inventory/:id
Auth: Required (owner, admin, or canViewAll)
```

### Create Item
```
POST /api/inventory
Auth: Required
Origin: Required
```
**Request:**
```json
{
  "name": "Vintage Jacket",
  "description": "Great condition",
  "purchaseDate": "2024-01-15",
  "purchasePrice": "25.00",
  "purchaseLocation": "Goodwill",
  "category": "Clothing",
  "notes": "Label says XL",
  "metadata": {}
}
```
**Response 201:** Created item object.

### Update Item
```
PUT /api/inventory/:id
Auth: Required (owner or admin)
Origin: Required
```
All fields optional. Status transitions validated against `ALLOWED_TRANSITIONS`.
- Setting status to `donated` or `discarded` auto-sets `removalDate` to current timestamp.
- Setting status from `returned` to `available` clears `removalDate`.
- **No auto-creation of $0 sale records** for donated/discarded items.

### Delete Item
```
DELETE /api/inventory/:id
Auth: Required (owner or admin)
Origin: Required
```
Hard delete. Cascading deletes photos and sales records. **Response 200:** `{ "success": true }`

### Upload Photo
```
POST /api/inventory/:id/photo
Auth: Required (item owner only)
Origin: Required
Content-Type: multipart/form-data
```

### Delete Photo
```
DELETE /api/inventory/:id/photo?photoId=5
Auth: Required (item owner only)
Origin: Required
```

### Serve Photo
```
GET /api/photos/:itemId/:filename
Auth: Required (owner, admin, or canViewAll)
```

### Bulk Update Status
```
PATCH /api/inventory/bulk
Auth: Required (owner of all items)
Origin: Required
```
**Request:**
```json
{ "ids": [1, 2, 3], "status": "donated" }
```
Validates all status transitions. Sets/clears `removalDate`. **Does not create $0 sale records** for donated/discarded items.

### Bulk Delete
```
DELETE /api/inventory/bulk?ids=1,2,3
Auth: Required (owner of all items)
Origin: Required
```

---

## Sales

### List Sales
```
GET /api/sales?page=1&pageSize=20&search=jacket&startDate=2024-01-01&endDate=2024-12-31&platform=ebay&sortBy=soldDate&sortOrder=desc
Auth: Required (user sees own sales; admin/canViewAll sees all)
```

### Create Sale
```
POST /api/sales
Auth: Required
Origin: Required
```
**Behavior:**
- If `itemId` provided, item must exist, not already be sold, and user must own it (or be admin/canViewAll).
- Transactionally updates item status to `sold` and sets `removalDate`.

### Process Refund
```
PATCH /api/sales
Auth: Required (sale creator or admin)
Origin: Required
```
**Request:**
```json
{
  "saleId": 1,
  "refundAmount": "25.00",
  "refundReason": "Item not as described",
  "refundType": "refund_with_return"
}
```
- `refund_with_return`: Transactionally sets item status to `returned` and clears `removalDate`.
- `refund_no_return`: Item stays `sold`; refund amount and reason recorded.

### Update Sale
```
PUT /api/sales/:id
Auth: Required (sale creator or admin)
Origin: Required
```

### Delete Sale
```
DELETE /api/sales/:id
Auth: Required (sale creator or admin)
Origin: Required
```
Transactionally reverts item status to `available` (if currently `sold` or `returned`).

### Get Single Sale
```
GET /api/sales/:id
Auth: Required (sale creator, admin, or canViewAll)
```

---

## Mileage

### List Mileage Entries
```
GET /api/mileage?page=1&pageSize=20&startDate=2024-01-01&endDate=2024-12-31
Auth: Required (own entries only)
```

### Create Mileage Entry
```
POST /api/mileage
Auth: Required
Origin: Required
```

### Update / Delete Mileage
```
PUT /api/mileage/:id
DELETE /api/mileage/:id
Auth: Required (owner or admin)
Origin: Required (for mutations)
```

### Mileage Reports
```
GET /api/mileage/reports?startDate=2024-01-01&endDate=2024-12-31
Auth: Required (own data only)
```

### Mileage Export
```
GET /api/mileage/export?startDate=2024-01-01&endDate=2024-12-31
Auth: Required (own data only)
```

---

## Reports

### Dashboard Stats
```
GET /api/reports?startDate=2024-01-01&endDate=2024-12-31
Auth: Required (user sees own data; admin/canViewAll sees all)
```
Profit is computed in TypeScript using `calculateProfit()` — single source of truth. No duplicate SQL formula.

---

## Import

### Import CSV Data
```
POST /api/import
Auth: Required
Origin: Required
```
**Request:**
```json
{
  "type": "inventory",
  "csvData": "name,purchase_date,purchase_price\nJacket,2024-01-15,25.00",
  "columnMappings": { "name": "Item Name" }
}
```
**Response 200:**
```json
{ "success": 45, "errors": ["Row 12 skipped: missing item name"] }
```

---

## Profile

### Get Profile
```
GET /api/profile
Auth: Required
```
**Response 200:**
```json
{ "user": { "id": 1, "email": "user@example.com", "name": "User", "role": "user", "canViewAll": false } }
```

### Update Profile
```
PUT /api/profile
Auth: Required
Origin: Required
```
**Update name:**
```json
{ "type": "profile", "name": "New Name" }
```
**Change password:**
```json
{
  "type": "password",
  "currentPassword": "OldP@ss123",
  "newPassword": "NewP@ss456"
}
```
Password change updates `passwordChangedAt`, invalidating all existing sessions.

---

## Settings

### Get Settings
```
GET /api/settings
Auth: Required (any authenticated user)
```
**Response 200:**
```json
{ "company_name": "My Resale Business", "company_tagline": "Quality Finds", "sales_tax_rate": 0.0825, "setup_complete": true }
```

### Update Settings
```
PUT /api/settings
Auth: Admin only
Origin: Required
```

---

## Admin — User Management

### List Users
```
GET /api/admin/users?page=1&pageSize=50&role=user&isActive=true&search=john
Auth: Admin only
```
Password hashes excluded from responses. `canViewAll` field included.

### Create User
```
POST /api/admin/users
Auth: Admin only
Origin: Required
```
**Request:**
```json
{ "email": "new@example.com", "password": "SecureP@ss1", "name": "New User", "role": "user", "canViewAll": false }
```
`role` must be `admin` or `user`.

### Get / Update / Delete User
```
GET /api/admin/users/:id
PUT /api/admin/users/:id
DELETE /api/admin/users/:id?transferDataTo=5
Auth: Admin only
Origin: Required (for mutations)
```
Update includes `canViewAll` field. Admin cannot deactivate or change role of their own account.

### Reset User Password
```
POST /api/admin/users/:id/reset-password
Auth: Admin only
Origin: Required
```
**Request:**
```json
{ "newPassword": "NewSecureP@ss1" }
```
This also updates `passwordChangedAt` on the user, invalidating all their existing sessions.

---

## Admin — Backup & Restore

### Export Backup
```
GET /api/admin/backup
Auth: Admin only
```

### Restore Backup
```
POST /api/admin/restore
Auth: Admin only
Origin: Required
```

### Unlock Setup
```
POST /api/admin/setup-unlock
Auth: Admin only
Origin: Required
```

---

## Removed Endpoints from v1

| Method | Path | Reason |
|--------|------|--------|
| GET | `/api/csrf-token` | Replaced by Origin/Referer verification |
| POST | `/api/admin/users/[id]/revoke-sessions` | Replaced by password reset (updates `passwordChangedAt`) |
| DELETE | `/api/admin/delete-inventory` | Debug-only, removed from spec |
| DELETE | `/api/admin/delete-sales` | Debug-only, removed from spec |