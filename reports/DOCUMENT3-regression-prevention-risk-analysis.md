# Document 3: Regression Prevention Plan + Risk Analysis

---

## Risk Matrix

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Existing orders show missing `delivery_notes` or break when queried | Low (2/5) | **Critical (5/5)** — all existing orders affected | New column is `NULLABLE` with no `DEFAULT`; existing `SELECT *` queries retrieve `NULL`; existing INSERTs with explicit column lists omit it → no breakage |
| R2 | RLS changes create infinite recursion (policy that queries the same table) | Medium (3/5) | High (4/5) — all queries to `customer_addresses` fail | The new `store_select` policy only does 2-level joins (customer_addresses → customers → delivery_orders → stores/store_staff) using `IN (SELECT ...)`, never references `customer_addresses` itself → no recursion. Mitigation: run `EXPLAIN ANALYZE` on the policy on staging |
| R3 | Store staff with `can_create_orders` cannot access new flow | Low (2/5) | High (4/5) — staff blocked from creating orders | The INSERT RLS policy on `delivery_orders` already checks `can_create_orders` via `store_staff` table. The new flow uses the **exact same INSERT logic** as the old flow. Mitigation: test with a staff account |
| R4 | `ensure_customer_by_phone` RPC behavior changes | Low (1/5) | Critical (5/5) — all order creation breaks | **No changes to this RPC.** The migration Phase 1 explicitly does NOT touch it. The new flow calls it identically to the old flow. Mitigation: insert a regression test comment in the migration file |
| R5 | Customer phone lookup creates duplicate customers | Low (2/5) | Medium (3/5) — data quality issue | `ensure_customer_by_phone` uses `WHERE phone = p_phone AND deleted_at IS NULL` with `LIMIT 1` then `INSERT` only if not found. The new flow calls it the same way. Mitigation: add a unique partial index `CREATE UNIQUE INDEX uq_customer_phone_active ON customers(phone) WHERE deleted_at IS NULL` as a safety net |
| R6 | RLS policy for store `SELECT` on `customer_addresses` accidentally exposes addresses of other stores' customers | Medium (3/5) | High (4/5) — data privacy violation | The policy joins through `delivery_orders` filtered by `store_id`. A store can only see addresses of customers who have ordered from that specific store. Mitigation: code review of the policy SQL + integration test querying from a different store |
| R7 | New components consume old `colors` import (not `useColors()`) causing dark mode breakage | Medium (3/5) | Medium (3/5) — visual only | Code review checklist: every component must use `const colors = useColors()` inside the component, never `import { colors } from '...'`. Mitigation: add to PR review template |
| R8 | Hardcoded spacing/fontSize values instead of design tokens | Medium (3/5) | Low (2/5) — visual inconsistency | Code review check: every numeric literal for spacing/font/radius must use a token from `spacing.ts`/`fontSize.ts`/`borderRadius.ts`. Exception: `lineHeight` calculations, icon sizes in pixel values |
| R9 | Location picker screen fails on devices without Google Play Services (Android) | Medium (3/5) | Medium (3/5) — feature broken on some devices | The existing `SharedMap` component uses `provider={undefined}` (OSM tiles) which works everywhere. The `LocationPickerScreen` builds on `SharedMap` — no provider dependency. Mitigation: test on a device without Google services |
| R10 | Reverse geocode timeout (10s) causes poor UX on slow networks | Medium (3/5) | Low (2/5) — degraded UX | Existing `reverseGeocodeWithFallback` already handles timeout with a coordinates fallback. The new flow reuses this same utility. Mitigation: none needed, already mitigated |
| R11 | `delivery_notes` is not included in the existing `DeliveryOrders` TypeScript type, causing a type error in the new INSERT | Low (1/5) | High (4/5) — build failure | Phase 1 explicitly adds `delivery_notes: string | null` to the interface. The new INSERT passes it explicitly as `delivery_notes`. Mitigation: typecheck command in CI |
| R12 | Customer address management (Phase 5) accidentally updates/deletes addresses from wrong customer | Low (2/5) | High (4/5) — data corruption | All mutations on `customer_addresses` filter by `customer_id` obtained from the customer lookup step — never from user input. The DELETE filter includes `AND customer_id = <validated_id>`. RLS prevents deleting another customer's addresses. Mitigation: use RLS as second line of defense |
| R13 | Phone lookup search blocks UI thread while awaiting RPC | Low (2/5) | Medium (3/5) — frozen UI | The RPC call is already async/await. The `loading` state disables the search button. Mitigation: verify loading indicator renders during the lookup |
| R14 | Back-navigation during the flow loses accumulated state | Medium (3/5) | High (4/5) — user frustration | The Zustand `create-order-store` persists state across the stack screens. Reset only on flow entry (redirect from index.tsx). Mitigation: add `onbeforeunload`-style warning if user tries to navigate away mid-flow? Not possible on mobile — instead, warn in review screen if data is incomplete |
| R15 | Migration 059 fails on production because `customer_addresses` RLS already has policies | Medium (3/5) | Critical (5/5) — deployment rollback | The migration uses `CREATE POLICY IF NOT EXISTS` (or wraps in `DROP POLICY IF EXISTS` → `CREATE POLICY` pattern). Test on a staging copy of production data first |
| R16 | Driver/Chat/Notifications screens reference `delivery_orders` columns that don't exist after migration | Low (1/5) | Critical (5/5) | No column is being renamed, dropped, or altered. Only `ADD COLUMN` which is additive. Existing queries that use explicit column lists are unaffected. Mitigation: see section below on untouched areas |
| R17 | The `store_select` policy on `customer_addresses` is evaluated for every row, causing performance issues on stores with many orders | Low (2/5) | Medium (3/5) — slow queries | The subquery `customer_id IN (SELECT c.id FROM customers c JOIN delivery_orders do2 ...)` runs per row. For a store with 10,000 orders this could be slow. Mitigation: use `EXISTS` instead of `IN` for better early-termination, or cache the customer IDs. Monitor query performance |
| R18 | `delivery_notes` column added to `delivery_orders` exceeds the max column limit (PostgreSQL: 1600) | Very Low (1/5) | Medium (3/5) | The table currently has ~40 columns. Adding 1 is safe. Track total column count |

---

## Areas That Must NOT Be Touched

### 1. Existing Orders (Data Integrity)
- `delivery_orders` rows: **NO ALTER** of any existing column type, default, or constraint
- New `delivery_notes` column: `ADD COLUMN ... TEXT` (nullable, no default) — does not affect existing rows
- `order_status_history`: untouched
- `order_assignments`: untouched

### 2. Driver Screens
All files under `mobile/app/(app)/(driver)/` are **read-only** in this project.
- Files: `en-route.tsx`, `documents.tsx`, `settings.tsx`, `account-status.tsx`, `rewards.tsx`, `orders.tsx`, `profile.tsx`, `about.tsx`, `appearance.tsx`, `help.tsx`, `privacy.tsx`, `language.tsx`, `notification-settings.tsx`, `wallet.tsx`, `report-issue.tsx`, `delivery-summary.tsx`, `confirm-delivery.tsx`, `pickup-confirmation.tsx`, `confirm-acceptance.tsx`, `[orderId].tsx`, `index.tsx`, `conversations.tsx`
- Components under `mobile/src/components/driver/`: untouched

### 3. Chat Screens
- `mobile/app/(app)/(chat)/[orderId].tsx`: untouched
- `mobile/app/(app)/(chat)/_layout.tsx`: untouched
- Chat-related components: untouched
- `conversations.tsx` in store tab: untouched

### 4. Notifications
- `mobile/app/(app)/(notifications)/`: untouched
- `mobile/src/components/NotificationsButton.tsx`: untouched

### 5. Auth & Setup
- `mobile/app/(auth)/`: untouched
- `mobile/app/(setup)/`: untouched
- `mobile/app/(app)/_layout.tsx`: untouched (tab root layout)

### 6. Existing RPCs
- `ensure_customer_by_phone`: **NOT MODIFIED** — it is called identically from both old and new flows
- `find_customer_by_phone`: untouched
- `is_admin`: untouched
- `user_role`: untouched
- All lifecycle RPCs (`accept_order`, `arrive_at_destination`, etc.): untouched

### 7. Existing Reusable Components
- `mobile/src/components/ui/` files: untouched (except possibly adding new components)
- `mobile/src/components/ProfileScreen.tsx`: untouched (the store profile tab re-exports it)

---

## RLS Change Safety Analysis

### New Policy: `store_select_customer_addresses`

```sql
CREATE POLICY "store_select_customer_addresses" ON public.customer_addresses
  FOR SELECT USING (
    customer_id IN (
      SELECT c.id FROM public.customers c
      JOIN public.delivery_orders do2 ON do2.customer_id = c.id
      WHERE do2.store_id IN (
        SELECT id FROM public.stores WHERE owner_id = auth.uid()
      )
      OR do2.store_id IN (
        SELECT store_id FROM public.store_staff WHERE profile_id = auth.uid()
      )
    )
  );
```

**Recursion analysis:**
- The policy queries `customers` and `delivery_orders` — neither table references `customer_addresses` in its RLS policies
- `delivery_orders` RLS policies use `stores`, `store_staff`, `drivers`, `customers` — NOT `customer_addresses`
- **No infinite recursion possible**

**Permission check:**
- `authenticated` role already has `SELECT` on `customer_addresses` (granted in migration 032)
- The RLS policy now restricts what visible rows are — it never affects the permission itself

**Performance:**
- The subquery `SELECT id FROM stores WHERE owner_id = auth.uid()` is fast (indexed)
- If the store has many orders, `customer_id IN (SELECT ... JOIN delivery_orders ...)` can be heavy
- **Optimization:** Change to `EXISTS (SELECT 1 FROM delivery_orders ...)` — PostgreSQL can short-circuit

---

## Column Safety Summary

| Table | New Column | Type | Nullable | Default | Existing Data |
|-------|-----------|------|----------|---------|---------------|
| `customer_addresses` | `notes` | `TEXT` | ✅ YES | `NULL` | All existing rows get `NULL` |
| `delivery_orders` | `delivery_notes` | `TEXT` | ✅ YES | `NULL` | All existing rows get `NULL` |

**Rule:** NEVER use `NOT NULL`, `DEFAULT`, `ALTER COLUMN ... SET`, `ALTER COLUMN ... TYPE`, or `DROP COLUMN` on existing tables in this project. Always additive.

---

## Mutation Safety (Customer Address Management)

### INSERT Pattern
```typescript
const { error } = await supabase.from('customer_addresses').insert({
  customer_id: validatedCustomerId,  // ← never from URL params directly
  label,
  address_text,
  latitude,
  longitude,
  landmark,
  apartment,
  floor,
  notes,
  is_default: false,
});
```

### DELETE Pattern (soft delete)
```typescript
const { error } = await supabase
  .from('customer_addresses')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', addressId)
  .eq('customer_id', validatedCustomerId);  // ← double-filter
```

### UPDATE Pattern
```typescript
const { error } = await supabase
  .from('customer_addresses')
  .update({ ...fields })
  .eq('id', addressId)
  .eq('customer_id', validatedCustomerId);  // ← double-filter
```

### Set Default (transactional)
```typescript
// 1. Unset all defaults for this customer
await supabase
  .from('customer_addresses')
  .update({ is_default: false })
  .eq('customer_id', validatedCustomerId)
  .eq('is_default', true);

// 2. Set the new default
await supabase
  .from('customer_addresses')
  .update({ is_default: true })
  .eq('id', addressId)
  .eq('customer_id', validatedCustomerId);
```

---

## State Management Safety

### Zustand Store Reset
The `create-order-store` must be **reset** when:
1. User enters the flow (initial redirect from `index.tsx`)
2. User completes an order (after successful CREATE)
3. User cancels mid-flow and goes back to orders list

It must **NOT** be reset when:
1. User navigates back/forward within the flow (state persists across steps)
2. App is backgrounded/foregrounded (React state survives this)

### Implementation in `create-order-flow/index.tsx`:
```typescript
const reset = useCreateOrderStore((s) => s.reset);

useEffect(() => {
  reset();  // Fresh state on every flow entry
  router.replace('./customer-lookup');
}, []);
```

---

## Migration Rollback Plan

If a migration fails in production:

```sql
-- Rollback 060 (delivery_notes)
ALTER TABLE public.delivery_orders DROP COLUMN delivery_notes;

-- Rollback 059 (notes + RLS)
DROP POLICY IF EXISTS "store_select_customer_addresses" ON public.customer_addresses;
ALTER TABLE public.customer_addresses DROP COLUMN notes;
```

**Rollback is safe** because no application code depends on these columns until Phase 4 (which is deployed separately). Between Phase 1 and Phase 4, the columns exist but are unused — if Phase 1 is rolled back, Phase 2-4 code still compiles (TS will just complain about missing columns in types).

---

## Pre-Deployment Checklist

### Database
- [ ] Migration 059 runs without error on staging copy of production
- [ ] Migration 060 runs without error on staging copy of production
- [ ] `EXPLAIN ANALYZE` on the new `store_select_customer_addresses` policy query — no sequential scans expected
- [ ] RLS policy verified: store can see addresses of its customers
- [ ] RLS policy verified: store CANNOT see addresses of another store's customers
- [ ] RLS policy verified: customer can still see own addresses (existing policy unchanged)
- [ ] `ensure_customer_by_phone` still works (no changes to it)
- [ ] Existing INSERT into `delivery_orders` succeeds without `delivery_notes`

### Frontend
- [ ] `npx tsc --noEmit` passes
- [ ] Project linter passes
- [ ] Old `create-order.tsx` flow works (before Phase 4)
- [ ] New multi-step flow works end-to-end
- [ ] Back navigation preserves state
- [ ] Dark mode renders correctly for all new components
- [ ] No hardcoded colors/spacing/fontSize/borderRadius in new components
- [ ] `delivery_notes` is `NULL` in DB when left blank in the form
- [ ] `delivery_notes` is stored correctly when filled in
- [ ] `notes` on `customer_addresses` is `NULL` when left blank
- [ ] Store staff with `can_create_orders` can create orders via new flow
- [ ] Customer with no saved addresses goes through map picker path
- [ ] Customer with saved addresses can select one
- [ ] "Pick on Map" in AddressForm opens LocationPickerScreen and returns coordinates

### No-Regression
- [ ] All driver screens render (spot-check 5 screens)
- [ ] Chat screen renders
- [ ] Notifications screen renders
- [ ] Store order detail renders with existing order data
- [ ] Store order list renders with all existing orders
- [ ] Customer tab for customers works (if you log in as customer role)
- [ ] Auth flow works
