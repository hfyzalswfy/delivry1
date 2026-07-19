# Store Stabilization Closure Audit Report

**Date:** 2026-07-18
**Scope:** Full-project stabilization audit before Store Management System implementation
**Audit Type:** Code-only audit (no code modification unless required to verify a fix)

---

## Executive Summary

This audit evaluated the FullDeliveryApp codebase across 14 dimensions to determine production readiness before proceeding with the Store Management System implementation.

**Final Verdict: NOT READY**

The project has **3 critical blockers**, **5 high-severity issues**, and **multiple architectural problems** that must be resolved before the Store System can be safely implemented. The most severe issues are: (1) a customer-side direct database update bypasses the official completion RPC (no wallet credit, no audit trail), (2) notification settings are entirely cosmetic UI with no persistence, and (3) extensive code duplication across the architecture with two unused hooks that should be replacing duplicated patterns.

---

## Files Audited

### Source Files (87 total)
- **mobile/app/** — 38 route/page files (Expo Router)
- **mobile/src/components/** — 22 component files
- **mobile/src/hooks/** — 10 custom hooks
- **mobile/src/store/** — 3 Zustand stores
- **mobile/src/services/** — 1 service file
- **mobile/src/types/** — 1 type definition file
- **mobile/src/lib/** — 2 library files
- **mobile/src/constants/** — 2 constant files
- **mobile/src/theme/** — 5 theme files
- **mobile/src/i18n/** — 4 i18n files

### Database Files (59 total)
- **supabase/migrations/001–060** — All migrations (001 through 060, with 044 missing)

---

## Migrations Audited

### Applied Migrations: 59
### Pending Migrations: 0
### Failed Migrations: 0
### Missing Migrations: 1 (044 — gap between 043 and 045)

### Tables Modified
- `delivery_orders` — 10+ column additions (on_the_way_at, reward_bonus, driver_arrived_destination_at, proof_signature_url, delivery_notes)
- `order_status_history` — Columns renamed (from_status→previous_status, to_status→new_status)
- `customer_addresses` — Added `notes` column
- `profiles` — Added chat participant RLS policy

### New Columns
- `on_the_way_at` (delivery_orders, 035)
- `reward_bonus` (delivery_orders, 048)
- `driver_arrived_destination_at` (delivery_orders, 049)
- `proof_signature_url` (delivery_orders, 049)
- `delivery_notes` (delivery_orders, 059)
- `notes` (customer_addresses, 059)

### Removed Columns
- None

### Renamed Columns
- `order_status_history.from_status` → `previous_status` (053)
- `order_status_history.to_status` → `new_status` (053)

### RLS Changes
- **035**: Introduced `driver_update` and `customer_update` policies on `delivery_orders` — critical for completion flow
- Multiple incremental fixes for recursive policy issues (030, 034, 041, 045, 047)

### RPC Changes
- `complete_delivery` — Finalized in 054 with atomic wallet credit, OTP verification, idempotency
- Lifecycle RPCs — `arrive_at_store`, `confirm_pickup`, `start_delivery` (055)
- `arrive_at_destination` (050)
- `accept_order` (051)
- `report_delivery_issue` (057)
- `ensure_customer_by_phone`, `find_customer_by_phone`, `link_customer_orders` (040)
- `ensure_conversation`, `add_driver_to_conversation` (043)
- `get_customer_info`, `get_customer_addresses` (060)

### Breaking Changes: YES

1. **Migration 053 — Column rename**: `order_status_history.from_status` → `previous_status`, `to_status` → `new_status`. Any code referencing old column names will break.
2. **Migration 035 — Policy change**: `driver_update` and `customer_update` policies were added to `delivery_orders`. Before this migration, only stores and admins could UPDATE delivery orders. Any code path that relied on the `store_update` policy to cover all updates would now be constrained.
3. **Migration 035 — Status change**: Trigger condition changed from `status = 'published'` to `status = 'pending'`. The `published` status is now effectively dead code in the enum.

---

## Verification Results

### 1. TypeScript

```
npx tsc --noEmit
```

**Result:** ✅ PASS
**Errors:** 0
**Affected files:** None

TypeScript compiles cleanly with zero errors. The `tsconfig.json` in `mobile/` is properly configured and all type definitions are consistent.

---

### 2. Database

| Check | Result |
|-------|--------|
| Applied migrations | 59 |
| Pending migrations | 0 |
| Failed migrations | 0 |
| Migration gap | **044 is missing** |
| Breaking changes | YES |

The database schema is largely stable but has accumulated significant complexity through 59 incremental migrations. The `order_status` enum has a dead value (`published`), and migration 044 is missing entirely — this could indicate a removed migration that causes version mismatch on fresh apply.

---

### 3. OrderPriority

| Question | Answer |
|----------|--------|
| Was the mismatch fixed? | **No** |
| Which solution was selected? | N/A — no fix was applied |
| Why? | No code path uses `'scheduled'` in practice; UI options explicitly limit to `['normal', 'express']` |
| Files affected | `mobile/src/types/database.ts:7` — TypeScript type includes `'scheduled'`; DB enum does not |
| Database affected? | No — no migration adds `'scheduled'` to the DB enum |
| Runtime risk remaining? | **Low** — the `PRIORITY_OPTIONS` array in `OrderDetailForm.tsx:50` only shows `['normal', 'express']`, so no user action can produce `'scheduled'`. However, a direct API call or future code change could trigger a DB error. |

**Verdict:** The mismatch exists but poses no immediate runtime risk because no code path writes `'scheduled'` to the database. It is a type-safety gap that should be resolved before adding Store features.

---

### 4. Customer Completion Flow

| Check | Result |
|-------|--------|
| Single official completion path? | **NO — 2 active paths** |
| Direct update() calls remaining? | **YES** — customer `[orderId].tsx:110-113` uses `supabase.from('delivery_orders').update({ status: 'delivered' })` |
| RPC usage for completion? | Partial — driver uses RPC, customer bypasses |
| Wallet credit handled? | RPC path ✅ — customer bypass ❌ |
| Rewards/incentives handled? | RPC path ✅ — customer bypass ❌ |
| Audit trail handled? | RPC path ✅ — customer bypass ❌ |
| Notifications handled? | Both paths ✅ (via DB trigger) |

**Verdict: FAIL**

The customer completion path at `mobile/app/(app)/(customer)/[orderId].tsx:110-113` performs a direct `update()` call that:
- Skips `order_status_history` insert (no audit trail)
- Skips wallet credit (driver never paid)
- Skips OTP verification (no security)
- Skips status validation (can complete from `on_the_way`)
- Skips driver stats increment

**Remaining locations:**
- `mobile/app/(app)/(customer)/[orderId].tsx:110-113` — Direct `update({ status: 'delivered' })` (CRITICAL)
- `supabase/migrations/035_fix_order_flow.sql:117-128` — `customer_update` RLS policy that enables this bypass
- `supabase/migrations/035_fix_order_flow.sql:108-114` — `driver_update` RLS policy (potential bypass vector — though no driver code uses it)

---

### 5. Notification Settings

| Check | Result |
|-------|--------|
| UI screen exists? | ✅ |
| Database backed? | ❌ — No `notification_preferences` table or column |
| AsyncStorage? | ❌ — Not used for notification settings |
| User profile column? | ❌ — `profiles` table has no notification preference columns |
| Works after app restart? | ❌ — All state is component-local `useState`, reset to defaults |
| Affects actual push delivery? | ❌ — Toggles have zero integration with `send-notification` edge function |
| Integrates with `push_tokens.is_active`? | ❌ — `is_active` is always `true`, never modified by UI |

**Verdict: FAIL**

The notification settings screen is **cosmetic-only UI**. Toggle switches update local React state only, with no persistence mechanism and no backend effect. Settings are lost on navigation away or app restart. The push delivery pipeline ignores user preferences entirely.

---

### 6. Realtime Channels

| Check | Result |
|-------|--------|
| Duplicate subscriptions? | ✅ None found |
| Memory leaks? | ✅ All channels cleaned up via `supabase.removeChannel()` |
| Subscribe-after-subscribe? | ✅ Single `.subscribe()` per channel |
| Channel disposal? | ✅ All use `supabase.removeChannel()` |
| Dead code? | ⚠️ `use-realtime-channel.ts` is defined but unused |
| Closure fragility? | ⚠️ `customer/[orderId].tsx` and `store/[orderId].tsx` use fragile closure pattern |

**Verdict: PASS** (with minor warnings)

All 17 active subscriptions across 13 files are properly managed. Two minor warnings: an unused generic hook (`use-realtime-channel.ts`) and a fragile closure pattern in two order detail screens.

---

### 7. React Hooks

| Check | Result |
|-------|--------|
| Conditional hooks? | ✅ None found |
| Hooks after early return? | ✅ None found |
| Hook order violations? | ✅ None found |
| Hooks in callbacks? | ✅ None found |

**Verdict: PASS**

All 10 custom hooks and all component files comply with the Rules of Hooks. Zero violations found across 87 source files.

---

### 8. Maps

| Check | Result |
|-------|--------|
| SharedMap component exists? | ✅ |
| Driver tracking? | ✅ |
| Store tracking? | ✅ |
| Customer tracking? | ✅ |
| Address picker? | ✅ |
| Location picker? | ✅ |
| Polyline rendering? | ✅ |
| Markers? | ✅ |
| Coordinate validation (`isValidCoordinate`)? | Partially — used in rendering paths but missing in `use-driver-location.ts` write path |
| Null Island prevention? | ⚠️ **Risk** — `create-order-store.ts` defaults to `pickupLat: 0, pickupLng: 0` |
| Realtime tracking? | ✅ Proper architecture with two-table approach |

**Verdict: PASS** (with reservations)

Three issues found:
1. `create-order-store.ts:42-46` defaults to Null Island coordinates (0,0)
2. `use-driver-location.ts` writes coordinates without validation
3. `AddressForm.tsx` and `LocationPickerScreen.tsx` lack `isValidCoordinate` checks on markers

---

### 9. Authentication

| Check | Result |
|-------|--------|
| Driver auth flow? | ✅ |
| Store auth flow? | ✅ |
| Customer auth flow? | ✅ |
| Admin auth flow? | ⚠️ — Admin silently mapped to store role, no admin dashboard |
| Session restore? | ✅ — `supabase.auth.getSession()` with AsyncStorage persistence |
| Logout? | ⚠️ — `SignOutButton.onPress` fires on tap not confirm; no explicit post-logout redirect |
| Protected routes? | ✅ — `useAuthGuard` hook with role-based redirect |

**Verdict: PASS** (with caveats)

Auth flows work correctly for all three primary roles. Issues found:
1. `onAuthStateChange` subscription in `auth-store.ts:52` is never cleaned up
2. `SignOutButton.tsx:14` triggers callback on tap, not on confirm dialog
3. Admin role has no dedicated experience

---

### 10. Shared Architecture Duplication

| Category | Severity | Count |
|----------|----------|-------|
| Duplicated Components | HIGH | Store & customer order detail ~60% identical |
| Duplicated Hooks | HIGH | `useOrderGuard` & `useRealtimeChannel` exist but unused |
| Duplicated Business Logic | HIGH | `fmtCurr` ×7, `fmtDist` ×4, status lists ×6 |
| Duplicated Wallet Logic | MEDIUM | Earnings queries ×3 |
| Duplicated Completion Logic | **CRITICAL** | Customer bypasses RPC |
| Duplicated Rewards Logic | LOW | Overlaps with earnings queries |
| Duplicated Notifications Logic | LOW | Unread count query duplication |
| Duplicated Realtime Logic | VERY HIGH | 16 manual subscriptions, shared hook unused |

**Key finding:** The codebase has extensive duplication across the three role-specific implementations. Two dedicated hooks (`useOrderGuard`, `useRealtimeChannel`) exist but are never imported — while their exact patterns are re-implemented manually in 5+ files each.

---

## Regression Results

### Module Status

| Module | Status | Notes |
|--------|--------|-------|
| Driver | ✅ PASS | All lifecycle RPCs used correctly, realtime tracking works |
| Store | ✅ PASS | Order creation flow complete, realtime subscriptions proper |
| Customer | ❌ **FAIL** | Completion bypass (direct update, no wallet/audit) |
| Chat | ✅ PASS | Shared component, RPC-based, realtime sub working |
| Wallet | ✅ PASS | Atomic transactions, auto-creation on profile insert |
| Rewards | ✅ PASS | Bonus system integrated with completion RPC |
| Notifications | ❌ **FAIL** | UI-only settings, no persistence, no push filtering |
| Maps | ⚠️ PASS | Functional but has Null Island risk and missing validation |
| Realtime | ✅ PASS | All channels properly managed |
| Addresses | ✅ PASS | CRUD complete, RPC-based customer lookup |
| Create Order | ✅ PASS | Zustand store, step-by-step flow, review screen |
| Tracking | ✅ PASS | Two-table approach, realtime subscription |
| Profile | ✅ PASS | Role-specific screens, linked to auth |
| Settings | ❌ **FAIL** | Notification settings not persisted |

---

## Remaining Risks

### Critical Risks
1. **Customer completion bypass** — Direct `update()` on `delivery_orders` without wallet credit, audit trail, or verification. Drivers may not get paid when customers confirm delivery.
2. **Notification settings not persisted** — All toggle state is lost on navigation away or app restart. Cosmetic-only UI.
3. **Missing migration 044** — Gap between migrations 043 and 045 could cause deployment failures or schema inconsistencies.

### High Risks
1. **OrderPriority type mismatch** — TypeScript allows `'scheduled'` but database enum doesn't include it. Future code changes could trigger runtime DB errors.
2. **Null Island defaults** — `create-order-store.ts` initializes coordinates to (0,0), which could propagate to `delivery_orders` if pickup location is never set.
3. **Duplicate realtime subscription patterns** — 16 manual implementations instead of using `useRealtimeChannel` hook, increasing maintenance burden and bug surface.
4. **Extensive code duplication** — High duplication across store/customer order detail screens, formatting functions, and guard logic.
5. **Unused hooks** — `useOrderGuard` and `useRealtimeChannel` are dead code that should either be removed or adopted across all screens.

### Medium Risks
1. **`onAuthStateChange` subscription leak** — `auth-store.ts:52` subscription never cleaned up on unmount.
2. **Driver location writes without validation** — GPS glitch data propagates to all watching screens.
3. **`SignOutButton.onPress` misfire** — Callback fires on button press, not on confirmation dialog.
4. **No explicit post-logout redirect** — Relies on React re-render cycle to trigger guard hook.
5. **Admin role mapped to store** — No admin-specific dashboard or experience.
6. **Column rename (053) not verified in app code** — `order_status_history` column rename needs code audit.

### Low Risks
1. **`published` status dead code** — Value exists in enum but unused after migration 035.
2. **Missing address form coordinate validation** — `AddressForm.tsx` doesn't call `isValidCoordinate`.
3. **Dead hook `use-realtime-channel.ts`** — Code that exists but serves no purpose.
4. **Fragile closure pattern** — Customer/store order detail screens share closure variable for conditional subscriptions.

### Resolved Risks
1. ✅ **Wallet not found on completion** — Migration 056 auto-creates wallets on profile insert.
2. ✅ **Report delivery issue lacking locks** — Migration 057 added FOR UPDATE lock and atomicity.
3. ✅ **Notification trigger missing cases** — Migration 046 added missing notification triggers.
4. ✅ **Chat RLS recursion** — Migration 045/047 fixed recursive policies.
5. ✅ **Driver location access** — Migration 039 added RLS for customer/store location reads.

### Risk Matrix

```
Probability
    ^
  High | Critical(3,1)           High(1,2)        
       |  3. Missing Mig 044   1. OrderPriority   
       |                       2. Null Island      
       |
 Medium|                       Medium(3,3)         
       |                       1. Auth sub leak    
       |                       2. Driver loc write 
       |                       3. SignOut bug      
       |
   Low |                        Low(4,4)           
       |                       1. Published dead   
       |                       2. Missing validation
       |                       3. Dead hooks       
       +----------------------------------->
              Low    Medium    High    Critical
                         Impact
```

---

## Scoring

| Dimension | Score (0–10) | Notes |
|-----------|-------------|-------|
| Architecture | 5 | Good patterns but extensive duplication; shared hooks unused |
| Database | 6 | 59/60 migrations applied; 1 missing; breaking changes present |
| Driver | 9 | Well-implemented lifecycle; all RPCs used correctly |
| Store | 8 | Order creation complete; realtime working |
| Customer | 4 | Completion bypass is critical; otherwise functional |
| Wallet | 8 | Atomic transactions; auto-creation; earnings + bonus |
| Rewards | 7 | Bonus system integrated; overlaps with earnings queries |
| Notifications | 2 | History works but settings are entirely cosmetic |
| Maps | 7 | Functional but Null Island risk and missing validation |
| Realtime | 8 | All channels managed; 2 minor warnings |
| **Production Readiness** | **5** | Critical blockers prevent safe production deployment |
| **Overall Readiness** | **5** | Must resolve critical and high risks before Store System |

---

## Final Recommendation

### Decision: NOT READY

The project is **not ready** for Store Management System implementation. Three critical blockers and five high-severity issues must be resolved first:

### Blocking Issues (Must Fix Before Store System)

1. **CRITICAL: Customer completion bypass**
   - **File:** `mobile/app/(app)/(customer)/[orderId].tsx:110-113`
   - **Fix:** Replace direct `update()` with `completeDelivery` RPC call
   - Alternatively, create a customer-safe `customer_complete_delivery` RPC with proper wallet credit

2. **CRITICAL: Notification settings persistence**
   - **File:** `mobile/app/(app)/(driver)/notification-settings.tsx`
   - **Fix:** Implement database-backed or AsyncStorage-backed persistence for toggle state
   - Add `notification_preferences` column to `profiles` or create new table
   - Wire toggles to `push_tokens.is_active` and/or edge function filtering

3. **CRITICAL: Missing migration 044**
   - **Fix:** Investigate and either recreate or properly skip migration 044
   - Verify migration chain from 043 → (044) → 045 applies correctly

### High Priority (Fix Before Store System)

4. **HIGH: OrderPriority mismatch**
   - **Fix:** Either add `'scheduled'` to DB enum via `ALTER TYPE order_priority ADD VALUE 'scheduled'`, or remove `'scheduled'` from TypeScript type

5. **HIGH: Null Island defaults in create-order-store**
   - **Fix:** Change `pickupLat: 0, pickupLng: 0, deliveryLat: 0, deliveryLng: 0` to `null` and handle nullable downstream

6. **HIGH: Adopt `useRealtimeChannel` hook**
   - **Fix:** Refactor 16 manual subscription implementations to use the existing generic hook

7. **HIGH: Adopt `useOrderGuard` hook**
   - **Fix:** Replace ~170 lines of duplicated guard logic in driver confirmation screens

8. **HIGH: Consolidate duplicated code**
   - **Fix:** Create `src/lib/format.ts` for formatting utilities
   - **Fix:** Share order detail screen base between store and customer

---

## Final Checklist

```
TypeScript ............ ✅
Database .............. ❌
OrderPriority ......... ❌
Completion RPC ........ ❌
Notifications ......... ❌
Realtime .............. ✅
Hooks ................. ✅
Maps .................. ⚠️
Authentication ........ ✅
Regression ............ ❌
Architecture .......... ❌
Production Ready ...... ❌

Final Status:
NOT READY
```
