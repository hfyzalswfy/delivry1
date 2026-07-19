# Store System Phase 2 — Progress Report

## Regression Fixes

### 1. customer_addresses RLS
- **Root Cause**: Store users inserting into `customer_addresses` via `add-address.tsx` violated RLS because the `store_insert` policy was being circumvented by direct table inserts.
- **Fix**: Created migration `062_store_add_customer_address.sql` with a SECURITY DEFINER RPC `add_customer_address()` that:
  - Verifies caller is a store owner or staff member
  - Inserts into `customer_addresses` bypassing RLS
  - Returns the created address as JSONB
  - `GRANT EXECUTE TO authenticated`
- **Files modified**: `mobile/app/(app)/(store)/create-order/add-address.tsx` — replaced direct `supabase.from('customer_addresses').insert()` with `supabase.rpc('add_customer_address', {...})`

### 2. Realtime Channel Lifecycle
- **Root Cause**: `store/[orderId].tsx` and `customer/[orderId].tsx` created a second channel (`locationChannel`) inside the `orderChannel.on()` callback, after `orderChannel.subscribe()` was already called. This violates the supabase-js realtime lifecycle rule: all `.on()` callbacks must be registered before `.subscribe()`.
- **Fix**: Refactored both files to use a **single channel** with ALL `.on()` callbacks registered before `.subscribe()`:
  - `store/[orderId].tsx`: Single `supabase.channel('store-order-{id}')` with `.on('UPDATE', delivery_orders)` + `.on('INSERT', driver_locations)` → `.subscribe()`
  - `customer/[orderId].tsx`: Single `supabase.channel('customer-order-{id}')` with the same pattern
  - Removed all conditional channel creation inside callbacks
  - Driver location subscription is always active (fires only when relevant events occur)

### 3. Navigation — Safe `router.back()`
- **Root Cause**: 9 locations used bare `router.back()` without `canGoBack()` guard, causing "GO_BACK was not handled by any navigator" warnings.
- **Fix**: All 9 locations now follow: `if (router.canGoBack()) router.back(); else router.replace(fallbackRoute)`
- **Files fixed**:
  - `store-address.tsx:76` — fallback to `/(app)/(store)`
  - `add-address.tsx:67` (cancel) — fallback to `/(app)/(store)`
  - `select-address.tsx:22` — fallback to `/(app)/(store)`
  - `[addressId].tsx:63` (customer edit) — fallback to `/(app)/(customer)/addresses`
  - `[addressId].tsx:99` (customer cancel) — fallback to `/(app)/(customer)/addresses`
  - `new.tsx:48` (customer insert) — fallback to `/(app)/(customer)/addresses`
  - `new.tsx:61` (customer cancel) — fallback to `/(app)/(customer)/addresses`
  - `location-picker.tsx:24` — fallback to `/(app)/(store)`
  - `confirm-delivery.tsx:211` (driver) — fallback to `/(app)/(driver)`

---

## Profile Architecture Refactor

### Shared Profile Components (new)
Created `mobile/src/components/profile/`:
- **`ProfileHeader.tsx`** — Avatar circle, name, role, phone
- **`ProfileStatsRow.tsx`** — Flex row of stat cards (value + label)
- **`ProfileCard.tsx`** — Generic card with title + `ProfileInfoRow` + `ProfileDocRow`
- **`ProfileMenuSection.tsx`** — List of menu items with icons and chevrons, supports `route` and `onPress`
- **`ProfileSignOut.tsx`** — Sign out button with confirmation Alert
- **`index.ts`** — Barrel exports

### Driver Profile (refactored, 211→184 lines)
- Replaced inline avatar/header → `ProfileHeader`
- Replaced inline stat cards → `ProfileStatsRow`
- Replaced Vehicle Info card → `ProfileCard` + `ProfileInfoRow`
- Replaced Bank Account card → `ProfileCard` + `ProfileInfoRow`
- Replaced Documents card → `ProfileCard` + `ProfileDocRow`
- Replaced menu items → `ProfileMenuSection`
- Replaced sign out button → `ProfileSignOut`
- Maintains i18n support via translated props
- Visual appearance unchanged

### Store Profile (rewritten, 2→109 lines)
- Was a 2-line re-export of `ProfileScreen`
- Now uses shared `ProfileHeader`, `ProfileStatsRow`, `ProfileCard`, `ProfileInfoRow`, `ProfileMenuSection`, `ProfileSignOut`
- Shows store information (name, phone, email, commercial registration)
- Menu: Store Address → Settings → Notifications
- Fetches store record from `stores` table

### Customer Profile (refactored, 202→141 lines)
- Replaced inline avatar/header → `ProfileHeader`
- Added `ProfileCard` for Account info
- Replaced sign out → `ProfileSignOut`
- Preserved saved addresses section with `AddressCard`
- Removed duplicated 70+ lines of inline styles

---

## Store System Phase 2

### Orders Module
**New file**: `mobile/app/(app)/(store)/orders.tsx`
- Full orders list with status filter tabs (All, Pending, Active, Delivered, Cancelled)
- Search bar for customer name, phone, or order number
- Paginated FlatList (20 items per page, infinite scroll)
- Pull-to-refresh
- Realtime subscription on `delivery_orders` table
- Tap any order → navigates to `[orderId]` detail screen
- Empty state with contextual messages

### Order Details Enhancement
**Modified**: `mobile/app/(app)/(store)/[orderId].tsx`
- **Order Timeline**: Fetches from `order_status_history` table, renders vertical timeline with colored dots and lines
- **Cancel Order**: Available for pending/published status (before driver assigned), calls `cancel_order` RPC
- **Duplicate Order**: Always visible, navigates to create-order flow
- **Edit Order**: Available for pending/published status, navigates to create-order flow
- **Action Buttons Row**: Chat + Duplicate side-by-side
- Timeline shows status labels and timestamps

### Customers Module
**New file**: `mobile/app/(app)/(store)/customers.tsx`
- Customer directory aggregated from store's `delivery_orders`
- Shows unique customers by phone with: name, phone, total orders, last order date
- Search bar for name and phone
- Quick Create Order button on each customer card
- Tap customer → navigates to their most recent order

### Store Settings
**New file**: `mobile/app/(app)/(store)/settings.tsx`
- Mirrors driver settings architecture (grouped `Card` sections with `CardDivider`)
- Store-specific options: Store Profile, Store Address, Notification Settings
- General: Language, Appearance, Help & Support, About
- Sign Out button with confirmation Alert

### Store Layout Update
**Modified**: `mobile/app/(app)/(store)/_layout.tsx`
- Added hidden screens: `orders`, `customers`, `settings`

### Dashboard Update
**Modified**: `mobile/app/(app)/(store)/index.tsx`
- Quick Actions: Create Order, All Orders, Customers, Settings (all active)
- "View All Orders" link under Recent Orders section
- Removed disabled "Coming in next phase" quick actions

---

## Files Added
| File | Purpose |
|------|---------|
| `supabase/migrations/062_store_add_customer_address.sql` | SECURITY DEFINER RPC for customer address insert |
| `mobile/src/components/profile/ProfileHeader.tsx` | Shared profile header |
| `mobile/src/components/profile/ProfileStatsRow.tsx` | Shared stats row |
| `mobile/src/components/profile/ProfileCard.tsx` | Shared card + info rows |
| `mobile/src/components/profile/ProfileMenuSection.tsx` | Shared menu section |
| `mobile/src/components/profile/ProfileSignOut.tsx` | Shared sign out button |
| `mobile/src/components/profile/index.ts` | Barrel exports |
| `mobile/app/(app)/(store)/orders.tsx` | Full orders list |
| `mobile/app/(app)/(store)/customers.tsx` | Customer directory |
| `mobile/app/(app)/(store)/settings.tsx` | Store settings |

## Files Modified
| File | Change |
|------|--------|
| `mobile/app/(app)/(store)/create-order/add-address.tsx` | Use RPC instead of direct insert |
| `mobile/app/(app)/(store)/[orderId].tsx` | Single channel pattern + timeline + actions |
| `mobile/app/(app)/(customer)/[orderId].tsx` | Single channel pattern |
| `mobile/app/(app)/(store)/store-address.tsx` | Safe router.back() |
| `mobile/app/(app)/(store)/create-order/select-address.tsx` | Safe router.back() |
| `mobile/app/(app)/(customer)/addresses/[addressId].tsx` | Safe router.back() |
| `mobile/app/(app)/(customer)/addresses/new.tsx` | Safe router.back() |
| `mobile/app/(app)/(store)/create-order/location-picker.tsx` | Safe router.back() |
| `mobile/app/(app)/(driver)/confirm-delivery.tsx` | Safe router.back() |
| `mobile/app/(app)/(driver)/profile.tsx` | Use shared profile components |
| `mobile/app/(app)/(store)/profile.tsx` | Use shared profile components |
| `mobile/app/(app)/(customer)/profile.tsx` | Use shared profile components |
| `mobile/app/(app)/(store)/_layout.tsx` | Register orders, customers, settings screens |
| `mobile/app/(app)/(store)/index.tsx` | Updated quick actions, view all link |

## Regression Verification
- TypeScript: **0 errors** (`npx tsc --noEmit`)
- All `router.back()` calls guarded with `canGoBack()`
- All realtime channels follow: `.channel()` → `.on()` × N → `.subscribe()` → cleanup
- `customer_addresses` insert uses SECURITY DEFINER RPC
- Shared profile components used across all 3 roles — no duplicate layouts or styles
- Store settings mirrors driver settings architecture
- No modifications to Driver workflows, Customer workflows, Chat, Notifications, Wallet, or Tracking

## Architecture Verification
- Supabase remains single source of truth — no fake data, no hardcoded values
- Existing components reused: `Card`, `CardDivider`, `ScreenLayout`, `EmptyState`, `SharedMap`, `TabIcon`, `AddressForm`, `AddressList`
- Existing hooks pattern followed: `useRealtimeChannel` style lifecycle in all channels
- Zustand store `useStoreDashboard` and `useCreateOrderStore` unchanged
- No duplicated SQL, components, hooks, services, or screens
- Navigation structure preserved — all new screens registered as `href: null` (hidden)
- Production-ready: no console.logs, no comments, no dead code
