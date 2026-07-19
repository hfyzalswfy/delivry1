# Project Health Report — Before Stabilization

Generated: 2026-07-19

---

## Architecture Score: 6/10

### Strengths
- Clear role-based routing (store/driver/customer/auth/setup)
- Zustand stores for auth, settings, create-order
- Supabase RLS and RPC-based architecture
- SharedMap component standardizes map usage
- i18n support (en/ar) in place

### Issues Found
1. **Duplicated coordinate validation**: `review.tsx` defines its own `isValidCoord` that duplicates `isValidCoordinate` in `geo.ts`
2. **Excessive debug logs**: 20+ AUTH_FLOW console.logs in `auth-store.ts`, 13 in app layouts/screens
3. **Dead code**: `PhoneLookupInput.tsx` component exists but is never imported
4. **Redundant settings load**: `useSettingsStore.load()` called in both root `_layout.tsx` and `(app)/_layout.tsx`
5. **Duplicated map picker**: 5 inline location picker implementations (`AddressForm.tsx`, `LocationPickerScreen.tsx`, `store-address.tsx`, `setup/index.tsx`, `review.tsx`) — all contain identical reverse geocode and current-location logic
6. **BackButton GO_BACK warning**: `BackButton.tsx` uses `router.canGoBack()` which can cause unhandled navigation issues

---

## Data Integrity Score: 7/10

### Strengths
- `delivery_orders` has NOT NULL constraints on pickup/delivery coordinates
- RPCs handle state transitions atomically
- `isValidCoordinate` utility exists and is widely used

### Issues Found
1. **Driver `openMap` uses weak check**: `if (!order.pickup_latitude || !order.pickup_longitude)` in driver screens fails on (0,0) — should use `isValidCoordinate`
2. **Store coordinates nullable but order creation requires them**: `stores.latitude/longitude` are nullable but `delivery_orders.pickup_latitude` is NOT NULL — orders fail silently if store has no coordinates
3. **No coordinate validation before insert in setup**: `app/(setup)/index.tsx` doesn't validate lat/lng before inserting into stores
4. **create-order-store.ts `pickupLat/pickupLng` nullable**: Review screen uses non-null assertions (`store.pickupLat!`) which will throw if null at runtime

---

## Navigation Score: 5/10

### Issues Found
1. **GO_BACK not handled warning**: `BackButton.tsx` routes may trigger unhandled navigation actions
2. **Router.replace vs push inconsistency**: Some screens use `router.replace` for discarding (review.tsx), others use `router.back()` or `router.push`
3. **No deep link handling**: No URL scheme or deep link configuration visible
4. **Driver tab layout has many hidden screens**: Non-tab screens registered in tabs layout — may cause navigation stack confusion

---

## Map Score: 7/10

### Strengths
- `SharedMap` component used in all map instances
- CartoDB tile URLs (light/dark) configured
- `forwardRef` on SharedMap allows imperative camera control
- Dark mode support via tile switching

### Issues Found
1. **`mapType="standard"` passed to SharedMap**: Overridden by custom tile layer — has no effect but confusing
2. **No map region persistence**: Maps always center on default (15.3694, 44.1910) or GPS — no stored state
3. **Initial region recomputation**: LocationPickerScreen creates new region object on every render via `useMemo` with lat/lng as deps — could cause unnecessary re-renders
4. **Polyline from pickup to delivery in en-route.tsx**: Draws a direct line between pickup and delivery, not actual route

---

## Database Score: 8/10

### Strengths
- 61 well-organized migrations
- RLS policies on all tables
- Atomic RPCs for state transitions
- Proper foreign key relationships
- Realtime publication tables configured

### Issues Found
1. **Migration 061 not yet applied**: Column additions for store address not in production
2. **No CHECK constraint on coordinates**: `delivery_orders` has NOT NULL but no CHECK constraint ensuring `latitude BETWEEN -90 AND 90`
3. **No index on `customer_addresses.customer_id`**: Address lookup queries do full scan
4. **`stores.latitude/longitude` nullable but business logic requires them**: Should have been NOT NULL from the start

---

## Known Bugs

### Critical
1. **Pickup coordinates fail on orders**: If a store has null lat/lng (which is most stores), order creation fails with coordinate validation error
2. **Driver location subscription thrashing**: `useDriverLocation` may create multiple GPS subscriptions on rapid re-renders

### Medium
3. **Double settings load**: `loadSettings()` called twice on app start (root layout + app layout)
4. **Review screen `pickupLat!` non-null assertion**: Will crash if pickup coordinates are not set
5. **Driver map check fails on (0,0)**: `if (!order.pickup_latitude)` is truthy for 0, so (0,0) passes validation incorrectly

### Low
6. **Mounted ref pattern inconsistent**: Some screens use `mountedRef`, others don't — risk of setState on unmounted component
7. **`mapType="standard"` prop on SharedMap does nothing**: Confusing leftover

---

## Hidden Risks

1. **No error boundary**: Any React crash shows white screen
2. **Supabase client in geo.ts**: Not applicable, but no network error handling in geo utility
3. **Ad-hoc coordinate validation in 5+ places**: Easy to miss one when adding coordinate validation
4. **PhoneLookupInput unused**: May confuse future developers
5. **All location pickers use (15.3694, 44.1910) as default**: This is Sana'a, Yemen — works for local market but unexpected default elsewhere

---

## Technical Debt

1. **Unused imports**: `AddressForm.tsx` imports `ActivityIndicator` and `isValidCoordinate` but may have unused references
2. **Driver order detail `driver_arrived_destination` status**: Added to BADGE map but no screen handles it — dead state
3. **`use-order-guard.ts`**: Uses deprecated string-based channel name pattern
4. **`Dimensions` imported but unused** in customer `[orderId].tsx`
5. **`SafeAreaView` inconsistency**: Some screens use it, others don't — inconsistent layout behavior

---

## Files Affected

### Directly affected by issues
| File | Issue |
|------|-------|
| `mobile/src/store/auth-store.ts` | Excessive debug logs (20 lines) |
| `mobile/app/_layout.tsx` | Debug log, redundant loadSettings call |
| `mobile/app/(app)/_layout.tsx` | Redundant loadSettings call |
| `mobile/app/(app)/(store)/_layout.tsx` | Debug log |
| `mobile/app/(app)/(store)/index.tsx` | Debug log |
| `mobile/app/(auth)/login.tsx` | Debug logs (9 lines) |
| `mobile/app/(app)/(store)/create-order/review.tsx` | Duplicated isValidCoord |
| `mobile/app/(app)/(store)/create-order/index.tsx` | Null store coordinates blocking |
| `mobile/app/(app)/(driver)/[orderId].tsx` | Weak coordinate check (line 271) |
| `mobile/app/(app)/(driver)/en-route.tsx` | Weak coordinate check (line 152) |
| `mobile/src/components/PhoneLookupInput.tsx` | Dead code (never imported) |
| `mobile/app/(setup)/index.tsx` | No coordinate validation before insert |
| `mobile/src/components/BackButton.tsx` | GO_BACK warning |
| `mobile/src/hooks/use-driver-location.ts` | Potential subscription thrashing |

---

## Summary

| Category | Score |
|----------|-------|
| Architecture | 6/10 |
| Data Integrity | 7/10 |
| Navigation | 5/10 |
| Map | 7/10 |
| Database | 8/10 |
| **Overall** | **6.6/10** |

**Production readiness: NOT_YET**

The project is functional but has several stability risks: debug logs pollute production console, coordinate validation is duplicated and inconsistently applied, navigation has unhandled edge cases, and the store pickup coordinates bug makes order creation fail for most stores.
