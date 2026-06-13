# Resell Inventory Manager — UI Specification

> **Version:** 2.0  
> **Date:** 2026-06-12  
> **Purpose:** Simplified page-by-page UI specification for the Resell Inventory Manager application.

---

## 1. Design System

### 1.1 Color Palette
- **Primary:** Blue-600 — buttons, active links
- **Danger:** Red-500/600 — delete buttons, destructive actions
- **Success:** Green-600 — profit values, "available" status
- **Warning:** Orange-100/800 — "returned" status
- **Neutral:** Gray-50–900 — backgrounds, text, borders
- **Dark mode:** Full support via `dark:` prefix classes

### 1.2 Typography
- **Font:** Geist Sans (primary), Geist Mono (monospace)
- **Headings:** `text-3xl font-bold` (page titles), `text-xl font-semibold` (section titles)
- **Body:** `text-sm` (labels), `text-base` (default)
- **Muted text:** `text-gray-500 dark:text-gray-400`

### 1.3 Layout
- **Max width:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Card style:** `bg-white dark:bg-gray-800 rounded-lg shadow p-6`
- **Page structure:** `<div className="min-h-screen bg-gray-50 dark:bg-gray-900">` > `<Header />` > `<main>`

### 1.4 Common Components
- **Primary button:** `bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors`
- **Danger button:** `bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md`
- **Secondary button:** `bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white`
- **Input field:** `w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white`
- **Status badge:** `px-2 py-1 rounded text-xs font-medium capitalize` + color class per status

### 1.5 Providers
All pages wrapped in `<SessionProvider>` from the root layout. **No CsrfProvider** — CSRF is handled by Origin/Referer verification on the server side. Browser `fetch()` automatically sends the `Origin` header.

---

## 2. Page Specifications

### 2.1 Login Page (`/login`)

**Auth:** Public (redirects to `/` if already authenticated)

**Elements:**
- Title: "Sign In"
- Email input (required, type=email)
- Password input (required, type=password)
- Sign In button (full width, blue-600)
- Error message area
- Footer text: "Contact your administrator to create an account."

**Behavior:**
- On submit: calls `signIn('credentials', { email, password, redirect: false })`
- On success: `window.location.href = '/'`
- On failure: shows "Invalid email or password"

### 2.2 Setup Page (`/setup`)

**Auth:** Public (only accessible when `needsSetup=true`)

**Modes:** Choose, Create Admin, Restore from Backup (same as v1).

### 2.3 Dashboard (`/`)

**Server Component** — directly queries the database.

4 stats cards + 2 action cards (Add Item, Record Sale). Same as v1.

### 2.4 Inventory List (`/inventory`)

**Server Component** for initial data, **Client Component** for interactivity.

- Search, filter (status, category, date range), sort
- Tile view / List view toggle
- Bulk actions (update status, delete)
- Pagination

**No CSRF token needed** for mutations — browser sends `Origin` header automatically.

### 2.5 Inventory Detail (`/inventory/[id]`)

Same as v1. Action buttons based on status.

### 2.6 Inventory Edit (`/inventory/[id]/edit`)

Same as v1. **Note:** Status change to `donated` or `discarded` sets `removalDate` but does NOT auto-create a $0 sale record.

### 2.7 New Item (`/inventory/new`)

Same as v1.

### 2.8 Sales List (`/sales`)

**Server Component** for initial data. Same filters and export as v1.

### 2.9 New Sale (`/sales/new`)

Uses `SalesEntryModal` with `useSaleForm` hook. **No CSRF token** — browser sends Origin automatically.

### 2.10 Sale Detail (`/sales/[id]`)

Same as v1. Refund via `RefundEntryModal`.

### 2.11 Mileage (`/mileage`)

Same as v1.

### 2.12 Import (`/imports`)

Same as v1.

### 2.13 Reports (`/reports`)

Same as v1. Profit computed client-side using `calculateProfit()` from `financial.ts` (single source of truth).

### 2.14 Profile (`/profile`)

Same as v1. When user changes password, all existing sessions are invalidated (via `passwordChangedAt` update).

### 2.15 Admin — User Management (`/admin/users`)

**Simplified RBAC:** Two roles (`admin`, `user`) with `canViewAll` toggle.

**Add User Modal:**
- Email, Name, Password, Role (admin/user), "Can view all data" checkbox (only shown for `user` role)

**Edit User Modal:**
- Email, Name, Role, Active status, "Can view all data" checkbox
- Admin cannot deactivate or change own role

**Reset Password Modal:**
- New password (with strength indicator)
- Note: "This will invalidate all of the user's active sessions."

**Delete User Modal:**
- Option to transfer data to another user
- Warning about permanent deletion

**Removed from v1:** "Revoke Sessions" button — replaced by password reset which automatically invalidates sessions.

### 2.16 Admin — Settings (`/admin/settings`)

Same as v1, plus "Download Backup" and "Restore from Backup" sections.

---

## 3. Navigation Header

**Component:** `Header` (client component)

- Company name from `/api/settings`
- Navigation links: Inventory, Sales, Mileage, Import, Reports, Profile
- Admin-only links: User Management, Settings (shown if `role === 'admin'`)
- User name display with role badge
- Sign Out button

### 3.1 Role Display

| Role | canViewAll | Badge |
|------|------------|-------|
| admin | N/A | "Admin" (blue) |
| user | true | "User · Can View All" (gray) |
| user | false | "User" (gray) |

---

## 4. Modal Components

### ConfirmModal
Same as v1.

### SalesEntryModal
Same as v1. **No CSRF token** in mutation requests.

### RefundEntryModal
Same as v1.

### UserModals
- CreateUserModal: includes `canViewAll` checkbox
- EditUserModal: includes `canViewAll` toggle
- DeleteUserModal: same as v1
- ResetPasswordModal: includes note about session invalidation

---

## 5. Client-Side Hooks

### `useSaleForm(initialData?)`
Same as v1 — manages sale form state with auto-tax calculation.

**Removed from v1:** `useCsrfToken` hook — no longer needed.

---

## 6. Mutation Requests

All mutation requests from client components use standard `fetch()` with `Content-Type: application/json`. The browser automatically sends the `Origin` header, which the server validates. No manual CSRF token injection needed:

```typescript
// Before (v1):
const res = await fetch('/api/inventory', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken,  // REMOVED
  },
  body: JSON.stringify(data),
});

// After (v2):
const res = await fetch('/api/inventory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

---

## 7. Dark Mode

Same as v1 — Tailwind `dark:` prefix classes, system preference detection.

---

## 8. Loading & Empty States

Same as v1 — skeleton loading, button loading states, empty state messages.