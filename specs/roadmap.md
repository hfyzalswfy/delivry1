# FullDelivery — Execution Roadmap

> **Version:** 1.0  
> **Status:** Draft for Review  
> **Last Updated:** 2026-07-12  

---

## Principles

1. **Module by Module** — Complete one module's UI before starting the next
2. **No breaking changes** — Never touch business logic, DB, RPCs, or navigation without explicit error
3. **Design-first** — Every screen follows the established Design System
4. **Consistency** — Same colors, spacing, typography, and component patterns across all screens
5. **Verification** — `npx tsc --noEmit` must pass after every change

---

## Phase Overview

```
Phase 0: Foundation  ─── Design System unification + dark theme extraction
    │
Phase 1: Driver UI  ─── Polish existing screens + build missing screens
    │
Phase 2: Store UI   ─── Build store dashboard + missing screens
    │
Phase 3: Customer   ─── Build customer addresses, ratings + polish
    │
Phase 4: Admin      ─── Build entire admin module from scratch
    │
Phase 5: Cross-Cut  ─── Offline, skeleton loading, error handling
    │
Phase 6: Release    ─── Final polish, testing, deployment
```

---

## Phase 0 — Design System Foundation

**Goal:** Extract a unified design system for the dark theme before touching any screen.

### Tasks

| # | Task | Files | Effort |
|---|------|-------|--------|
| 0.1 | Create `src/theme/dark-colors.ts` with unified dark palette | New file | 1h |
| 0.2 | Create `src/theme/dark-spacing.ts` | New file | 0.5h |
| 0.3 | Create `src/theme/status-badges.ts` shared badge config | New file | 1h |
| 0.4 | Create shared `Card`, `Button`, `Badge`, `Input` components in dark theme | `src/components/ui/` | 3h |
| 0.5 | Migrate Home screen to use theme tokens | `index.tsx` | 2h |
| 0.6 | Migrate Orders screen to use theme tokens | `orders.tsx` | 1h |
| 0.7 | Migrate [orderId] to use theme tokens | `[orderId].tsx` | 1h |
| 0.8 | Migrate en-route to use theme tokens | `en-route.tsx` | 1.5h |
| 0.9 | Migrate confirm-acceptance, pickup-confirmation, confirm-delivery, delivery-summary, report-issue | 5 files | 3h |
| 0.10 | Migrate wallet to use theme tokens | `wallet.tsx` | 0.5h |
| 0.11 | Create reusable `StatusBadge` component | New component | 0.5h |
| 0.12 | Create reusable `PageContainer` (SafeAreaView + bg) | New component | 0.5h |
| 0.13 | Verify all driver screens look identical after migration | Visual check | 2h |
| 0.14 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total Estimate:** ~17h

**Acceptance Criteria:**
- All driver screens look identical to before
- No inline color constants remain in driver screens (all imported from theme)
- Shared components are used where applicable
- `npx tsc --noEmit` passes
- No business logic changes

---

## Phase 1 — Driver UI Polish

**Goal:** Complete all driver screens to match the design reference, build missing screens.

### 1A — Wallet Expansion (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1.1 | Redesign wallet screen with balance card | `wallet.tsx` | 2h |
| 1.2 | Add transaction history list | `wallet.tsx` | 3h |
| 1.3 | Add earnings summary (today, week, month) | `wallet.tsx` | 2h |
| 1.4 | Add pull-to-refresh | `wallet.tsx` | 0.5h |
| 1.5 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~8h

### 1B — Driver Profile (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1.6 | Create driver-specific profile screen (replace shared component) | `profile.tsx` | 2h |
| 1.7 | Add vehicle info display (type, plate, color) | `profile.tsx` | 1h |
| 1.8 | Add bank account display | `profile.tsx` | 1h |
| 1.9 | Add delivery stats (total, rating) | `profile.tsx` | 1h |
| 1.10 | Add member since date | `profile.tsx` | 0.5h |
| 1.11 | Add edit navigation | `profile.tsx` | 0.5h |
| 1.12 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~6.5h

### 1C — Document Upload (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1.13 | Create Upload Documents screen | New screen | 3h |
| 1.14 | Document type cards (License, Registration, ID) | New screen | 2h |
| 1.15 | Camera/gallery integration for docs | New screen | 1h |
| 1.16 | Upload to Supabase Storage | New logic | 2h |
| 1.17 | Status display (pending/approved/rejected) | New screen | 1h |
| 1.18 | Retry upload for rejected docs | New screen | 1h |
| 1.19 | Add to tab navigation (replace profile or as hidden) | `_layout.tsx` | 0.5h |
| 1.20 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~11h

### 1D — Account Status (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1.21 | Create Account Status screen | New screen | 2h |
| 1.22 | Verification progress display | New screen | 1.5h |
| 1.23 | Document status per type | New screen | 1h |
| 1.24 | KYC status overview | New screen | 1h |
| 1.25 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~6h

### 1E — Home Screen Polish (Priority: Medium)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1.26 | Add pull-to-refresh | `index.tsx` | 1h |
| 1.27 | Wire Rewards button to real screen | `index.tsx` | 0.5h |
| 1.28 | Add notification badge animation | `index.tsx` | 1h |
| 1.29 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~3h

### 1F — En Route Map Polish (Priority: Medium)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1.30 | Auto-follow driver marker on map | `en-route.tsx` | 2h |
| 1.31 | Animate marker movement | `en-route.tsx` | 2h |
| 1.32 | Add store-to-driver polyline | `en-route.tsx` | 1h |
| 1.33 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~5.5h

### Phase 1 Total: ~40h

**Acceptance Criteria:**
- Wallet shows transactions, earnings summary
- Profile shows vehicle, bank, stats
- Documents can be uploaded from camera/gallery
- Account status shows verification progress
- Map follows driver location
- All screens consistent with design system
- `npx tsc --noEmit` = 0

---

## Phase 2 — Store UI

**Goal:** Build complete store module with dashboard, customer management, wallet, and settings.

### 2A — Store Dashboard (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.1 | Create store dashboard screen | New: `store/dashboard.tsx` | 4h |
| 2.2 | Today's stats (orders, revenue, active) | `dashboard.tsx` | 2h |
| 2.3 | Weekly order chart | `dashboard.tsx` | 3h |
| 2.4 | Recent activity feed | `dashboard.tsx` | 2h |
| 2.5 | Add to tab nav as new first tab | `_layout.tsx` | 0.5h |
| 2.6 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~12h

### 2B — Store Orders Polish (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.7 | Add status filter tabs | `store/index.tsx` | 2h |
| 2.8 | Add search bar | `store/index.tsx` | 1.5h |
| 2.9 | Add empty state | `store/index.tsx` | 1h |
| 2.10 | Add pull-to-refresh | `store/index.tsx` | 0.5h |
| 2.11 | Add cancel order button (before acceptance) | `store/[orderId].tsx` | 1.5h |
| 2.12 | Add delivery proof view (after delivery) | `store/[orderId].tsx` | 2h |
| 2.13 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~9h

### 2C — Customer Management (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.14 | Create store customers list screen | New: `store/customers.tsx` | 3h |
| 2.15 | Customer detail with order history | New: `store/customers/[id].tsx` | 3h |
| 2.16 | Search by name/phone | Both screens | 1h |
| 2.17 | Quick order from customer profile | `customers/[id].tsx` | 2h |
| 2.18 | Add to tab nav | `_layout.tsx` | 0.5h |
| 2.19 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~10h

### 2D — Store Wallet (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.20 | Create store wallet screen | New: `store/wallet.tsx` | 3h |
| 2.21 | Balance + transaction history | `store/wallet.tsx` | 2h |
| 2.22 | Revenue breakdown | `store/wallet.tsx` | 2h |
| 2.23 | Add to tab nav | `_layout.tsx` | 0.5h |
| 2.24 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~8h

### 2E — Store Settings (Priority: Medium)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.25 | Create store settings screen | New: `store/settings.tsx` | 2h |
| 2.26 | Edit store profile (name, logo, phone, address) | `store/settings.tsx` | 2h |
| 2.27 | Business hours | `store/settings.tsx` | 1.5h |
| 2.28 | Default settings | `store/settings.tsx` | 1h |
| 2.29 | Add to tab nav (or profile sub-screen) | `_layout.tsx` | 0.5h |
| 2.30 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~7.5h

### 2F — Employee Management (Priority: Medium)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.31 | Create employee list screen | New: `store/employees.tsx` | 2h |
| 2.32 | Add employee form | New: `store/employees/add.tsx` | 2h |
| 2.33 | Permission toggles | `employees/add.tsx` | 1h |
| 2.34 | Remove employee | `employees.tsx` | 0.5h |
| 2.35 | Add to tab nav or settings | `_layout.tsx` | 0.5h |
| 2.36 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~6.5h

### Phase 2 Total: ~53h

**Acceptance Criteria:**
- Dashboard shows real stats and charts
- Orders have status filters and search
- Customers are browseable with order history
- Wallet shows balance and transactions
- Settings editable
- Employees manageable

---

## Phase 3 — Customer UI

**Goal:** Complete customer module with address management, driver ratings, and polish.

### 3A — Customer Addresses (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.1 | Create address list screen | New: `customer/addresses.tsx` | 3h |
| 3.2 | Add address with map picker | New: `customer/addresses/add.tsx` | 3h |
| 3.3 | Edit/delete address | Both screens | 2h |
| 3.4 | Set default address | `addresses.tsx` | 1h |
| 3.5 | Add to tab nav | `_layout.tsx` | 0.5h |
| 3.6 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~10h

### 3B — Rate Driver (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.7 | Create rating/feedback table migration | New migration | 2h |
| 3.8 | Create rate driver screen after delivery | New: `customer/rate-driver.tsx` | 3h |
| 3.9 | Star rating + review text | `rate-driver.tsx` | 1.5h |
| 3.10 | Submit rating RPC | New RPC | 1.5h |
| 3.11 | Auto-prompt after delivery | `customer/[orderId].tsx` | 1h |
| 3.12 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~9.5h

### 3C — Customer Polish (Priority: Medium)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.13 | Add status filter tabs to order history | `customer/index.tsx` | 2h |
| 3.14 | Add reorder button for completed orders | `customer/index.tsx`, `[orderId].tsx` | 2h |
| 3.15 | Add empty state | `customer/index.tsx` | 1h |
| 3.16 | Add pull-to-refresh | `customer/index.tsx` | 0.5h |
| 3.17 | Show driver phone, ETA countdown | `customer/[orderId].tsx` | 2h |
| 3.18 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~8h

### Phase 3 Total: ~27.5h

**Acceptance Criteria:**
- Addresses can be saved, edited, deleted
- Driver can be rated after delivery
- Order history has filters
- Reorder works from history

---

## Phase 4 — Admin Module

**Goal:** Build the entire admin module from scratch.

### 4A — Foundation (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.1 | Create `(app)/(admin)/` directory + `_layout.tsx` | New directory | 2h |
| 4.2 | Update `useAuthGuard` to route admin to admin layout | `use-auth.ts` | 0.5h |
| 4.3 | Create admin tab bar with icons | `_layout.tsx` | 1h |
| 4.4 | Design admin theme tokens | New theme file | 1h |
| 4.5 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~5h

### 4B — Dashboard (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.6 | Create admin dashboard | `admin/index.tsx` | 4h |
| 4.7 | KPI cards (orders, drivers, stores, revenue) | `index.tsx` | 2h |
| 4.8 | Weekly order chart | `index.tsx` | 3h |
| 4.9 | Recent activity feed | `index.tsx` | 2h |
| 4.10 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~11.5h

### 4C — Driver Management (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.11 | Create driver list | `admin/drivers.tsx` | 3h |
| 4.12 | Status tabs (all, pending, verified, suspended) | `drivers.tsx` | 1.5h |
| 4.13 | Search/filter | `drivers.tsx` | 1h |
| 4.14 | Create driver detail | `admin/drivers/[id].tsx` | 4h |
| 4.15 | Document approval flow | `drivers/[id].tsx` | 3h |
| 4.16 | Suspend/activate driver | `drivers/[id].tsx` | 1h |
| 4.17 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~14h

### 4D — Store Management (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.18 | Create store list | `admin/stores.tsx` | 2.5h |
| 4.19 | Status tabs | `stores.tsx` | 1h |
| 4.20 | Create store detail | `admin/stores/[id].tsx` | 3h |
| 4.21 | Approve/suspend store | `stores/[id].tsx` | 1h |
| 4.22 | View store orders | `stores/[id].tsx` | 1.5h |
| 4.23 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~9.5h

### 4E — Customer Management (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.24 | Create customer list | `admin/customers.tsx` | 2h |
| 4.25 | Search/filter | `customers.tsx` | 1h |
| 4.26 | Create customer detail | `admin/customers/[id].tsx` | 2.5h |
| 4.27 | Block/unblock customer | `customers/[id].tsx` | 0.5h |
| 4.28 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~6.5h

### 4F — Orders Overview (Priority: High)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.29 | Create all-orders list | `admin/orders.tsx` | 3h |
| 4.30 | Status, date, store, driver filters | `orders.tsx` | 2h |
| 4.31 | Create admin order detail | `admin/orders/[id].tsx` | 3h |
| 4.32 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~8.5h

### 4G — Complaints (Priority: Medium)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.33 | Create issue list | `admin/complaints.tsx` | 2h |
| 4.34 | Status tabs (open, resolved) | `complaints.tsx` | 1h |
| 4.35 | Create issue detail | `admin/complaints/[id].tsx` | 2h |
| 4.36 | Resolve with notes | `complaints/[id].tsx` | 1h |
| 4.37 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~6.5h

### 4H — Platform Wallet (Priority: Medium)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.38 | Create wallet overview | `admin/wallet.tsx` | 3h |
| 4.39 | Transaction log with filters | `admin/wallet.tsx` | 2h |
| 4.40 | Revenue breakdown | `admin/wallet.tsx` | 1.5h |
| 4.41 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~7h

### 4I — Reports & Settings (Priority: Medium)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.42 | Create reports screen | `admin/reports.tsx` | 4h |
| 4.43 | Create settings screen | `admin/settings.tsx` | 3h |
| 4.44 | Notification broadcast | `admin/settings.tsx` | 2h |
| 4.45 | `npx tsc --noEmit` = 0 | — | 0.5h |

**Total:** ~9.5h

### Phase 4 Total: ~78h

**Acceptance Criteria:**
- Admin dashboard shows real platform KPIs
- Drivers, stores, customers are manageable
- Orders are visible with filters
- Complaints can be resolved
- Wallet shows financial overview
- Reports and settings functional

---

## Phase 5 — Cross-Cutting

**Goal:** Add system-wide features that benefit all modules.

| # | Task | Effort | Priority |
|---|------|--------|----------|
| 5.1 | Add `@react-native-community/netinfo` for offline detection | 1h | High |
| 5.2 | Create `OfflineBanner` component | 2h | High |
| 5.3 | Add offline banner to all layouts | 3h | High |
| 5.4 | Add retry mechanism on network errors | 3h | High |
| 5.5 | Create `SkeletonLoader` component | 2h | Medium |
| 5.6 | Replace spinners with skeletons on key screens | 4h | Medium |
| 5.7 | Add try/catch to all supabase fetches | 3h | High |
| 5.8 | Standardize error alert patterns | 2h | Medium |
| 5.9 | Add `react-native-signature-canvas` for signature capture | 3h | Medium |
| 5.10 | Wire signature capture in pickup-confirmation | 2h | Medium |
| 5.11 | Create Supabase Storage bucket for proof images | 1h | Medium |
| 5.12 | Upload photos to Storage instead of local URI | 3h | Medium |
| 5.13 | `npx tsc --noEmit` = 0 | 0.5h | — |

**Total:** ~30h

---

## Phase 6 — Final Polish & Release

**Goal:** Complete testing, fix edge cases, prepare for release.

| # | Task | Effort |
|---|------|--------|
| 6.1 | End-to-end workflow testing (all roles) | 8h |
| 6.2 | Edge case testing (empty states, errors, network) | 4h |
| 6.3 | Performance optimization (list virtualization, image caching) | 4h |
| 6.4 | Arabic language support (i18n) | 8h |
| 6.5 | Accessibility audit | 3h |
| 6.6 | App icon and splash screen polish | 2h |
| 6.7 | Store listing preparation | 3h |
| 6.8 | Bug fixes from testing | 4h |
| 6.9 | `npx tsc --noEmit` = 0 | 0.5h |

**Total:** ~36.5h

---

## Summary

| Phase | Focus | Est. Hours | Screens Built |
|-------|-------|-----------|---------------|
| 0 | Design System Foundation | 17h | 0 (refactor) |
| 1 | Driver UI Polish | 40h | 4 new |
| 2 | Store UI | 53h | 10 new |
| 3 | Customer UI | 27.5h | 4 new |
| 4 | Admin Module | 78h | 15 new |
| 5 | Cross-Cutting | 30h | 3 new components |
| 6 | Final Polish | 36.5h | 0 |
| **Total** | | **~282h** | **33+ new screens** |

### Recommended Order

→ **Start with Phase 0** (design system) — this is the foundation for everything
→ **Then Phase 1** (driver module) — the most stable, most used module
→ **Phase 2** (store) — next most critical business module
→ **Phase 3** (customer) — improves end-user experience
→ **Phase 4** (admin) — platform management
→ **Phase 5** (cross-cutting) — quality-of-life improvements
→ **Phase 6** (release) — final testing

---

## Approval Checkpoints

After each phase, the user should:
1. Review the built screens
2. Verify against the Product Spec
3. Test the workflow
4. Verify `npx tsc --noEmit` = 0
5. Approve before moving to next phase
