# Store System — Technical Audit Report

> **Author:** Lead Software Architect  
> **Date:** 2026-07-18  
> **Scope:** Full codebase audit — every screen, component, hook, migration, type, and config  
> **Command:** Inspect only. No modifications, no migrations, no refactors.

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Store Module Audit](#2-store-module-audit)
3. [Driver Module Audit](#3-driver-module-audit)
4. [Customer Module Audit](#4-customer-module-audit)
5. [Chat Audit](#5-chat-audit)
6. [Notification Audit](#6-notification-audit)
7. [Wallet Audit](#7-wallet-audit)
8. [Database Audit](#8-database-audit)
9. [Order Lifecycle Audit](#9-order-lifecycle-audit)
10. [Rewards Audit](#10-rewards-audit)
11. [Ratings Audit](#11-ratings-audit)
12. [Maps Audit](#12-maps-audit)
13. [Shared Components Audit](#13-shared-components-audit)
14. [Existing Design System](#14-existing-design-system)
15. [Missing Store Features](#15-missing-store-features)
16. [Dependency Graph](#16-dependency-graph)
17. [Risks](#17-risks)

---

## 1. Project Architecture

### 1.1 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native / Expo | SDK 52 |
| Router | expo-router (file-based) | 4.x |
| State | Zustand | 4.x |
| Database | Supabase (PostgreSQL) | — |
| Realtime | Supabase Realtime (WebSocket) | — |
| Maps | react-native-maps + OSM UrlTile | — |
| Auth | Supabase Auth | — |
| i18n | i18next + expo-localization | — |
| Theme | React Context + useSettingsStore | — |
| Icons | @expo/vector-icons (MaterialIcons) | — |
| Storage | Supabase Storage | — |

### 1.2 Folder Structure

```
mobile/
├── app/                          # Expo Router file-based routes (57 files)
│   ├── _layout.tsx               # Root layout
│   ├── +not-found.tsx            # 404
│   ├── index.tsx                 # Splash / redirect
│   └── (app)/
│       ├── _layout.tsx           # App-level layout (push token init)
│       ├── (auth)/               # Login, Register
│       ├── (setup)/              # Role-based onboarding
│       ├── (customer)/           # 10 files
│       ├── (store)/              # 12 files
│       ├── (driver)/             # 23 files
│       ├── (chat)/               # 2 files
│       └── (notifications)/     # 2 files
├── src/
│   ├── components/               # 12 screen-level + 5 driver + 10 UI = 27 files
│   │   ├── ui/                   # Shared UI primitives (10)
│   │   └── driver/               # Driver-specific (5)
│   ├── constants/                # icons.ts (112 entries), role config
│   ├── hooks/                    # 10 custom hooks
│   ├── i18n/                     # i18next + en/ar locales
│   ├── lib/                      # supabase.ts, geo.ts
│   ├── services/                 # delivery-service.ts (RPC wrappers)
│   ├── store/                    # auth-store, create-order-store, settings-store
│   ├── theme/                    # colors, spacing, ThemeProvider, driver-theme
│   └── types/                    # database.ts (324 lines)

supabase/
└── migrations/                   # 60 migrations (001-060, gap at 044)
```

### 1.3 Navigation Hierarchy

```
Root (_layout.tsx)
├── (auth)                        # Login / Register
├── (setup)                       # Role onboarding
└── (app)                         # Authenticated routes
    ├── (store)                   # 4 tabs: Orders, (New Order hidden), Messages, Profile
    │   └── create-order/         # Stack: Lookup → Select Address → Order Details → Review
    ├── (customer)                # 3 tabs: Orders, Messages, Profile
    │   └── addresses/            # Stack: List → New → Edit → Complete Address
    ├── (driver)                  # 5 tabs: Home, Orders, Chat, Wallet, Profile
    │   └── 17 non-tab screens    # Order lifecycle, settings, etc.
    ├── (chat)/[orderId].tsx      # Shared chat screen
    └── (notifications)/          # Notification list
```

### 1.4 State Management

| Store | File | Purpose |
|-------|------|---------|
| `auth-store` | `src/store/auth-store.ts` | Session, user, profile, signIn/signUp/signOut, role setup check |
| `create-order-store` | `src/store/create-order-store.ts` | Order creation wizard state (customer, pickup, delivery, details) |
| `settings-store` | `src/store/settings-store.ts` | Theme mode persistence (AsyncStorage) |

### 1.5 Database Access Pattern

```
Screen → Custom Hook (optional) → supabase.rpc() / supabase.from().select()
        → Realtime Channel (postgres_changes)
        → Service Layer (delivery-service.ts for lifecycle RPCs)
```

Every async effect uses a **cancellation-safe pattern** (`let cancelled = false; if (cancelled) return;`).

### 1.6 Realtime Architecture

- Supabase Realtime `postgres_changes` subscriptions
- Per-screen channel names: `store-orders-{profileId}`, `store-order-{orderId}`, `store-driver-loc-{orderId}`
- Publication includes: `delivery_orders`, `driver_locations`, `notifications`, `wallet_transactions`, `messages`, `conversations`, `conversation_participants`

---

## 2. Store Module Audit

### 2.1 File Inventory (12 files)

```
app/(app)/(store)/
├── _layout.tsx                  # Tab navigator
├── index.tsx                    # Orders list with realtime
├── [orderId].tsx                # Order detail + live tracking
├── profile.tsx                  # Re-exports ProfileScreen (2 lines)
├── conversations.tsx            # Re-exports ConversationsScreen (2 lines)
└── create-order/
    ├── _layout.tsx              # Stack navigator (7 screens)
    ├── index.tsx                # Customer lookup by phone
    ├── select-address.tsx       # Select from saved addresses
    ├── add-address.tsx          # Add new address during order
    ├── location-picker.tsx      # Map-based location picker
    ├── order-details.tsx        # Shipment details form
    └── review.tsx               # Final review + create order
```

### 2.2 Screen Status

| Screen | Status | Lines | Notes |
|--------|--------|-------|-------|
| `_layout.tsx` | **Complete** | 65 | 4 tabs + 2 hidden routes; follows driver layout pattern |
| `index.tsx` | **Complete** | 126 | Orders list with realtime INSERT/UPDATE/DELETE; StyleSheet recreated in useMemo (performance issue) |
| `[orderId].tsx` | **Complete** | 248 | Full order detail + driver card + live tracking map + chat button |
| `profile.tsx` | **Complete** | 2 | Thin re-export of shared ProfileScreen |
| `conversations.tsx` | **Complete** | 2 | Thin re-export of shared ConversationsScreen |
| `create-order/_layout.tsx` | **Complete** | 24 | 7-screen stack with themed headers |
| `create-order/index.tsx` | **Complete** | 236 | Phone lookup via `get_customer_info` RPC; loads store pickup; routes to select-address or location-picker |
| `create-order/select-address.tsx` | **Complete** | 149 | Fetches via `get_customer_addresses` RPC; has Confirm button; good empty state |
| `create-order/add-address.tsx` | **Complete** | 74 | Inserts via `customer_addresses`; uses `router.replace` for clean nav |
| `create-order/location-picker.tsx` | **Complete** | 36 | Thin wrapper around LocationPickerScreen |
| `create-order/order-details.tsx` | **Complete** | 58 | Wraps OrderDetailForm; guards missing delivery lat/lng |
| `create-order/review.tsx` | **Complete** | 245 | Creates order via `ensure_customer_by_phone` + `delivery_orders.insert`; validates coords |

### 2.3 Placeholder / Missing Screens

| Screen | Status | Notes |
|--------|--------|-------|
| Store Dashboard | **MISSING** | No dashboard/home with stats, charts, or KPIs |
| Order Cancel UI | **MISSING** | No cancel button in store order detail |
| Wallet | **MISSING** | No store wallet screen exists (driver has one) |
| Rewards / Loyalty | **MISSING** | No store-side rewards or loyalty program |
| Customer List | **MISSING** | No customer directory or history per store |
| Reports / Analytics | **MISSING** | No reports, charts, or export functionality |
| Support / Ticket System | **MISSING** | No support request flow |
| Store Settings | **MISSING** | No store settings screen (profile exists but no business settings) |
| Staff Management | **MISSING** | No staff/employee management UI (table `store_staff` exists) |
| Rating Store Owner | **MISSING** | No screen to rate the store or view store ratings |

### 2.4 Strengths

- Create-order wizard is **fully functional**: lookup → select/add address → details → review → create
- Realtime subscriptions on orders list and individual order
- Coordinate validation before order creation (`isValidCoordinate`)
- Driver tracking map with SharedMap, markers, polyline
- Chat integration with driver via `(chat)/[orderId]`
- RPC-based customer lookup bypasses RLS correctly

### 2.5 Weaknesses

- `index.tsx` recreates `StyleSheet` inside `useMemo` — 16 inline styles, acceptable but not ideal
- No error boundary or retry logic on failed order creation
- `handleEdit` for 'pickup' section in review.tsx is empty (`break`) — no way to edit pickup
- `store.customerId` can be `null` in add-address.tsx — returns early without user feedback
- No loading skeleton for order list (uses full-screen spinner)
- No pull-to-refresh on order list

---

## 3. Driver Module Audit

### 3.1 File Inventory (23 files)

```
app/(app)/(driver)/
├── _layout.tsx              # 5 tabs + 17 non-tab screens
├── index.tsx                # Home: header, stats, available orders, quick actions
├── orders.tsx               # Available + active orders with sort/filter
├── [orderId].tsx            # Order detail with contextual actions
├── conversations.tsx        # Re-export (2 lines)
├── wallet.tsx               # Balance, period earnings, transactions
├── rewards.tsx              # Lifetime earnings, bonuses, achievements
├── profile.tsx              # Profile with vehicle info, bank, documents
├── settings.tsx             # Settings menu
├── language.tsx             # Language picker (en/ar)
├── appearance.tsx           # Theme mode picker
├── privacy.tsx              # Privacy toggles
├── notification-settings.tsx # Notification toggles (UI-only, not persisted)
├── help.tsx                 # FAQ accordion
├── about.tsx                # App info
├── account-status.tsx       # Verification + documents status
├── documents.tsx            # Document upload (camera/gallery)
├── en-route.tsx             # Live map + timeline + actions
├── confirm-acceptance.tsx   # Order acceptance with checkbox
├── pickup-confirmation.tsx  # Pickup verification (photo/notes)
├── confirm-delivery.tsx     # Delivery verification (OTP/photo)
├── delivery-summary.tsx     # Post-delivery earnings breakdown
└── report-issue.tsx         # Issue reporting form
```

### 3.2 Reusable Patterns (Standard for Store)

| # | Pattern | Location | Store Should Copy |
|---|---------|----------|------------------|
| A | **Cancellation-safe async effects** | All screens | Every async effect |
| B | **Realtime subscription management** | index.tsx, orders.tsx, [orderId].tsx | Orders list + detail |
| C | **Dynamic StyleSheet factory** | 10+ screens | If styles depend on dynamic data |
| D | **Access-gated screen rendering** | 4 screens | For status-gated screens |
| E | **Status→Badge maps** | 5 screens + StatusBadge.tsx | Already available |
| F | **Formatting helpers** | 10+ screens (fmtCurr, fmtDist, fmtETA) | **Needs extraction** to shared utils |
| G | **Zustand store pattern** | 3 stores | Follow existing pattern |
| H | **Custom hooks** | 3 driver hooks | Create store equivalents |
| I | **Tab layout with non-tab screens** | _layout.tsx | Already followed |
| J | **Verification/proof capture** | 2 screens | Not needed for store (driver-only) |
| K | **RPC service facade** | delivery-service.ts | Already centralized |
| L | **Theme/spacing constants** | All files | Already centralized |
| M | **Icon constants** | All files | Already centralized |
| N | **Empty/loading/error states** | All screens | Already have components |
| O | **useFocusEffect data refresh** | 4 screens | For dashboard |

### 3.3 Formatting Helpers (Need Extraction)

Defined inline in 10+ driver screens, never extracted:

```typescript
// Currency — hardcoded to YER
function fmtCurr(v: number): string { return `${v.toLocaleString('en-US', {...})} YER`; }
// Distance
function fmtDist(km: number): string { return km < 1 ? `${(km*1000).toFixed(0)} m` : `${km.toFixed(1)} km`; }
// ETA
function fmtETA(min: number): string { return min >= 60 ? `${Math.floor(min/60)}h ${min%60}m` : `${min} min`; }
// Date
function fmtDate(s: string): string { /* Today, Yesterday, or date */ }
// Payment method
function fmtPay(m: string): string { /* cash→'Cash on Delivery', etc. */ }
```

---

## 4. Customer Module Audit

### 4.1 File Inventory (10 files)

```
app/(app)/(customer)/
├── _layout.tsx                    # 3 tabs + 2 hidden routes
├── index.tsx                      # Orders list + address redirect
├── [orderId].tsx                  # Order detail + live tracking + confirm delivery
├── profile.tsx                    # Profile with saved addresses
├── conversations.tsx              # Re-export (2 lines)
└── addresses/
    ├── _layout.tsx                # Stack: List, New, Edit, Complete
    ├── index.tsx                  # Address list with CRUD
    ├── new.tsx                    # Add address form
    ├── [addressId].tsx            # Edit address form
    └── complete-address.tsx       # First-run onboarding with map
```

### 4.2 Reusable Patterns for Store

| Pattern | File | Notes |
|---------|------|-------|
| Address CRUD | `addresses/*` | AddressList + AddressForm + AddressCard are shared components |
| First-run onboarding | `complete-address.tsx` | Pattern could apply to store setup |
| Realtime order list | `index.tsx` | Same pattern as store (different filter) |
| Driver tracking map | `[orderId].tsx` | Same map pattern as store (different polyline target) |
| Address redirect guard | `index.tsx` (line 28-48) | Redirects to complete-address if no saved addresses |

### 4.3 Key Observations

- Customer `[orderId].tsx` has a **direct Supabase update** for delivery confirmation (not an RPC):
  ```typescript
  const confirmDelivery = async () => {
    await supabase.from('delivery_orders').update({ status: 'delivered' }).eq('id', orderId);
  };
  ```
  This bypasses the atomic `complete_delivery` RPC — issues:
  - No wallet credit for driver
  - No verification (OTP/photo)
  - No order_status_history entry
  - No notification trigger (UPDATE of status column does fire `trg_notify_order_status`, but without full context)

- Customer `index.tsx` creates StyleSheet outside the component — **correct pattern** (store version uses useMemo, which is unnecessary since colors change on theme toggle — should be dynamic or recreated)

---

## 5. Chat Audit

### 5.1 Implementation

| Component | Status | Lines |
|-----------|--------|-------|
| `use-chat.ts` hook | **Complete** | 193 |
| `use-conversations.ts` hook | **Complete** | 133 |
| `ConversationsScreen.tsx` | **Complete** | 185 |
| `(chat)/[orderId].tsx` screen | **Complete** | 329 |
| `(chat)/_layout.tsx` | **Complete** | 18 |

### 5.2 Architecture

```
(store)/conversations.tsx          (customer)/conversations.tsx          (driver)/conversations.tsx
  └── ConversationsScreen (shared)    └── ConversationsScreen (shared)    └── ConversationsScreen (shared)
         └── links to (chat)/[orderId]      └── links to (chat)/[orderId]      └── links to (chat)/[orderId]
                                                    └── useConversation(orderId)
                                                         ├── ensure_conversation RPC
                                                         ├── fetch messages + sender profiles
                                                         ├── Realtime INSERT on messages
                                                         ├── Presence for typing indicators
                                                         └── sendMessage()
```

### 5.3 Production Readiness

| Aspect | Status |
|--------|--------|
| Real-time messaging | ✅ Working |
| Typing indicators | ✅ Working (Presence, 1.5s debounce) |
| Message grouping | ✅ By date + 5-min sender windows |
| Auto-scroll | ✅ With `isAtBottom` detection |
| Sender profile fetch | ✅ Cached in ref |
| Loading/empty states | ✅ Present |
| **Error handling** | ⚠️ `sendMessage` errors silently swallowed |
| **No Zustand store** | ⚠️ State lives in hook, not reusable globally |
| **Image/file sending** | ❌ Not implemented |
| **Read receipts** | ❌ Not implemented |
| **Conversation list realtime** | ❌ No live updates for new conversations |

### 5.4 Store Reuse Assessment

**Can reuse without modification.** Store already has:
- `(store)/conversations.tsx` → re-exports ConversationsScreen ✅
- `(store)/[orderId].tsx` → links to `(chat)/[orderId]` ✅
- `(store)/_layout.tsx` → "Messages" tab ✅

No changes needed for chat. Store participates as a conversation participant (profile role = 'store').

---

## 6. Notification Audit

### 6.1 Implementation

| Component | Status | Lines |
|-----------|--------|-------|
| `use-notifications-list.ts` | **Complete** | 86 |
| `use-push-token.ts` | **Complete** | 69 |
| `(notifications)/index.tsx` | **Complete** | 155 |
| `(notifications)/_layout.tsx` | **Complete** | 19 |
| `NotificationsButton.tsx` | **Complete** | 17 |
| Driver notification-settings.tsx | UI Only | 74 (not persisted) |

### 6.2 Current Events (Trigger-Based)

| Event | Trigger | Recipients |
|-------|---------|------------|
| New order created | `trg_notify_new_order` on INSERT | Nearby drivers |
| Order status change | `trg_notify_order_status` on UPDATE (6 statuses) | Store, Customer, Driver |
| New message | Application-level in `sendMessage()` | Other participants |
| Delivery issue reported | `report_delivery_issue` RPC | Admin, Store owner |

### 6.3 Missing Events

| Event | Who Fires | Recipients |
|-------|-----------|------------|
| Order cancelled | Store (no UI yet) | Driver, Customer |
| Driver accepted | Already exists (via status change) | ✅ |
| Store rejects driver | No driver rejection flow in store | ❌ Not needed |
| Pickup ready / delayed | No manual store trigger | ❌ Not implemented |
| Rating received | No rating system (Phase 3B) | ❌ Not implemented |

### 6.4 Events Store Should Publish

| Event | Trigger | Recipients |
|-------|---------|------------|
| Order cancelled by store | Store cancel action | Driver, Customer |
| Pickup confirmed (store-side) | Store marks ready | Driver |
| Package not ready / delay | Store initiates delay | Driver, Customer |

### 6.5 Store Reuse Assessment

Notification system is **fully reusable**. Store already has:
- `NotificationsButton` in header right (`_layout.tsx`)
- Notifications list via `(notifications)/index.tsx`
- Push token registration via `usePushToken()` (running at app root)
- Notification triggers already fire for store-relevant events

No changes needed.

---

## 7. Wallet Audit

### 7.1 Current Capabilities

| Feature | Status | Location |
|---------|--------|----------|
| Wallet table | ✅ Complete | Migration 015 |
| Transaction table | ✅ Complete | Migration 016 |
| `add_wallet_transaction` RPC | ✅ SECURITY DEFINER, ACID-safe | Migration 016, 026 |
| Auto-create wallet on profile insert | ✅ Trigger | Migration 056 |
| RLS: read own wallet | ✅ | Migration 025 |
| Wallet credit on delivery | ✅ In `complete_delivery` RPC | Migration 054 |
| Driver wallet screen | ✅ Balance, periods, history | `(driver)/wallet.tsx` |
| **Store wallet screen** | ❌ **Missing** | No store wallet UI |
| **Withdrawal/payout UI** | ❌ **Missing** | No payout flow |
| **Wallet-payment for orders** | ⚠️ Partial | `payment_method: 'wallet'` exists in enum + form but `complete_delivery` deposits, not deducts |

### 7.2 Database Schema

```sql
wallets (profile_id UNIQUE → profiles)
  └── wallet_transactions (wallet_id → wallets, reference_type: order|dispute|payout)
```

The comment in migration 015 says: "محافظ المستخدمين (السائقين + المتاجر)" — wallets are intended for drivers AND stores.

### 7.3 How Store Will Interact

1. **Read-only initially**: Store wallet screen to view balance and transaction history
2. **Payment in**: Store receives delivery fee (minus commission) when order completes — currently only driver gets credited
3. **Payment out**: Store pays delivery fee to platform — not implemented
4. **Platform commission**: Future — `delivery_orders.platform_commission` column exists but never processed

### 7.4 Current `complete_delivery` Wallet Flow

```
complete_delivery RPC (atomic):
  ├── Lock order row
  ├── Validate status + driver assignment
  ├── Verify OTP/photo
  ├── Update order → delivered
  ├── INSERT order_status_history
  ├── Get driver wallet (by profile_id from drivers)
  ├── Lock wallet row
  ├── Calculate v_total = driver_earnings + reward_bonus
  └── add_wallet_transaction(+, v_total, 'deposit', 'delivery payment')
```

The store is **not credited** in the current flow. The `delivery_orders.delivery_fee` is stored but not distributed.

---

## 8. Database Audit

### 8.1 Entity Relationship Overview

```
auth.users
    │ (id)
    └── profiles (PK = auth.users.id)
            ├── wallets (UNIQUE profile_id) → wallet_transactions
            ├── push_tokens
            ├── notifications
            ├── stores (owner_id → profiles)
            │       ├── store_staff (profile_id → profiles, store_id → stores)
            │       └── delivery_orders (store_id → stores, created_by → profiles)
            │               ├── order_assignments (driver_id → drivers)
            │               ├── order_status_history
            │               ├── conversations (1:1 with order)
            │               │     ├── conversation_participants (profile_id → profiles)
            │               │     └── messages (sender_id → profiles)
            │               ├── driver_locations (through order_id)
            │               └── delivery_issues (driver_id → drivers)
            ├── customers (profile_id → profiles, nullable)
            │       └── customer_addresses
            └── drivers (profile_id → profiles, UNIQUE)
                    ├── driver_documents
                    ├── driver_locations
                    └── delivery_orders (as assigned_driver_id)
```

### 8.2 Table Inventory (21 tables)

| # | Table | Records Store? | RLS | Realtime |
|---|-------|---------------|-----|----------|
| 1 | `profiles` | ✅ | ✅ | ❌ |
| 2 | `stores` | **Core** | ✅ | ❌ |
| 3 | `store_staff` | **Core** | ✅ | ❌ |
| 4 | `customers` | ✅ | ✅ | ❌ |
| 5 | `customer_addresses` | ✅ | ✅ (store_read via 060) | ❌ |
| 6 | `drivers` | — | ✅ | ❌ |
| 7 | `driver_documents` | — | ✅ | ❌ |
| 8 | `shipment_types` | ✅ | ✅ | ❌ |
| 9 | **`delivery_orders`** | **Core** | ✅ | ✅ (058) |
| 10 | `order_assignments` | ✅ | ✅ | ❌ |
| 11 | `order_status_history` | ✅ | ✅ | ❌ |
| 12 | `driver_locations` | ✅ | ✅ (store_read via 039) | ✅ (058) |
| 13 | `conversations` | ✅ | ✅ | ✅ (043) |
| 14 | `conversation_participants` | ✅ | ✅ | ✅ (043) |
| 15 | `messages` | ✅ | ✅ | ✅ (043) |
| 16 | `notifications` | ✅ | ✅ | ✅ (058) |
| 17 | `notification_templates` | — | ✅ | ❌ |
| 18 | `wallets` | ✅ | ✅ | ❌ |
| 19 | `wallet_transactions` | ✅ | ✅ | ✅ (058) |
| 20 | `push_tokens` | ✅ | ❌ | ❌ |
| 21 | `delivery_issues` | ✅ | ✅ | ❌ |

### 8.3 Foreign Keys (Store-Relevant)

| From | To | Type |
|------|----|------|
| `stores.owner_id` | `profiles.id` | RESTRICT |
| `store_staff.store_id` | `stores.id` | CASCADE |
| `store_staff.profile_id` | `profiles.id` | CASCADE |
| `delivery_orders.store_id` | `stores.id` | RESTRICT |
| `delivery_orders.created_by` | `profiles.id` | RESTRICT |
| `delivery_orders.customer_id` | `customers.id` | RESTRICT |
| `delivery_orders.assigned_driver_id` | `drivers.id` | SET NULL |
| `delivery_orders.shipment_type_id` | `shipment_types.id` | RESTRICT |
| `customer_addresses.customer_id` | `customers.id` | CASCADE |

### 8.4 RLS Policies (Store-Relevant)

| Table | Policy | Operation | Condition |
|-------|--------|-----------|-----------|
| `stores` | `read_own`, `insert_own`, `update_own`, `admin_all` | SELECT/INSERT/UPDATE | Owner or staff |
| `store_staff` | `read_own`, `insert_own` | SELECT/INSERT | Own store staff |
| `delivery_orders` | `store_select`, `store_insert`, `store_update` | SELECT/INSERT/UPDATE | Own store_id |
| `customer_addresses` | `store_select` (060) | SELECT | Via `get_customer_addresses` RPC |
| `customer_addresses` | `store_insert` (059,060) | INSERT | For any customer during order creation |
| `customers` | `read_own` only | SELECT | Via `get_customer_info` RPC for store lookup |
| `driver_locations` | `store_select_driver_location` (039) | SELECT | For orders belonging to store |

### 8.5 RPC Functions (20 total)

| RPC | Purpose | Store Uses? |
|-----|---------|-------------|
| `get_customer_info(p_phone)` | Lookup customer by phone (SECURITY DEFINER) | ✅ (060) |
| `get_customer_addresses(p_customer_id)` | Get customer addresses (SECURITY DEFINER) | ✅ (060) |
| `ensure_customer_by_phone(p_phone, p_name)` | Find or create customer | ✅ (review.tsx) |
| `accept_order(p_order_id, p_driver_id)` | Driver accepts order | ❌ |
| `arrive_at_store(p_order_id, p_driver_id)` | Driver arrives at store | ❌ |
| `confirm_pickup(p_order_id, p_driver_id, ...)` | Driver confirms pickup | ❌ |
| `start_delivery(p_order_id, p_driver_id)` | Driver starts delivery | ❌ |
| `arrive_at_destination(p_order_id, p_driver_id)` | Driver arrives | ❌ |
| `complete_delivery(p_order_id, p_driver_id, ...)` | Complete delivery + wallet credit | ❌ |
| `report_delivery_issue(...)` | Report issue | ❌ |
| `add_wallet_transaction(...)` | Credit/debit wallet | Future |
| `ensure_conversation(p_order_id)` | Create chat conversation | ✅ (via chat hooks) |
| `find_customer_by_phone(p_phone)` | Legacy customer lookup | Replaced by 060 |

### 8.6 Migration 060 (Latest — Critical for Store)

Creates 2 SECURITY DEFINER RPCs and one policy:

- `get_customer_info(p_phone TEXT)` → `TABLE(id UUID, full_name TEXT)` — bypasses RLS so stores can look up customers with zero orders
- `get_customer_addresses(p_customer_id UUID)` → `TABLE(id, customer_id, label, address_text, latitude, longitude, apartment, floor, landmark, notes, is_default, deleted_at, created_at, updated_at)` — bypasses RLS
- `CREATE POLICY "store_insert" ON customer_addresses FOR INSERT WITH CHECK (...)` — allows stores to add addresses for customers

### 8.7 Tables That MUST NEVER Be Modified

| Table | Reason |
|-------|--------|
| `auth.users` | Supabase-managed; schema is fixed |
| `order_status_history` | Append-only audit log; schema frozen |
| `shipment_types` | Reference data; code depends on exact columns |
| `notification_templates` | Reference data; schema frozen |

### 8.8 Tables Safe to Extend (Additive Only)

| Table | Add nullable columns? | Notes |
|-------|----------------------|-------|
| `delivery_orders` | ✅ | Already has 47+ columns; 8 added via migrations |
| `customer_addresses` | ✅ | Extended by 059 (notes) |
| `stores` | ✅ | Could add operating_hours, delivery_radius, etc. |
| `store_staff` | ✅ | Could add permissions |
| `profiles` | ✅ | Could add fields (but prefer role-specific tables) |
| `wallets` | ✅ | Already flexible |

### 8.9 Key Discrepancies: TypeScript vs SQL

| Table | TS Type | SQL | Issue |
|-------|---------|-----|-------|
| `OrderStatus` | includes `'published'` | ✅ Same | OK |
| `OrderPriority` | `'normal' \| 'express' \| 'scheduled'` | Enum only has `normal`, `express` | **BUG**: `'scheduled'` in TS does not exist in DB |
| `OrderStatusHistory` | `note: string \| null` | Column is `notes` (plural) | **Minor mismatch** |
| `OrderAssignments` | `assigned_at` field | Column does **not exist** in SQL | **BUG**: TS field mapped to non-existent column |
| `NotificationType` | `notification_type \| null` | SQL is `NOT NULL` | Safe (TS is more permissive) |

---

## 9. Order Lifecycle Audit

### 9.1 Complete State Machine

```
  pending (store creates)
    │
    ▼  (accept_order RPC — migration 051)
  driver_accepted
    │  [sync_assigned_driver trigger runs]
    ▼  (arrive_at_store RPC — migration 055)
  driver_arrived_store
    │
    ▼  (confirm_pickup RPC — migration 055)
  picked_up
    │
    ▼  (start_delivery RPC — migration 055, or auto in en-route.tsx)
  on_the_way
    │
    ▼  (arrive_at_destination RPC — migration 050)
  driver_arrived_destination
    │
    ▼  (complete_delivery RPC — migration 050, 054)
  delivered
    [wallet credited, total_deliveries incremented]

ANY → cancelled (direct update with cancel_reason + cancelled_by)
```

### 9.2 Database Updates Per Transition

| Transition | Timestamp Set | Additional Effects |
|------------|---------------|-------------------|
| `pending` → `driver_accepted` | `driver_accepted_at`, `assigned_at` | `order_assignments` INSERT (status=accepted); other pending assignments rejected; notification sent |
| `driver_accepted` → `driver_arrived_store` | `driver_arrived_store_at` | Notification sent |
| `driver_arrived_store` → `picked_up` | `picked_up_at` | Optionally stores `proof_image_url`; notification sent |
| `picked_up` → `on_the_way` | `on_the_way_at` | Notification sent |
| `on_the_way` → `driver_arrived_destination` | `driver_arrived_destination_at` | Notification sent |
| → `delivered` | `delivered_at` | `order_status_history` INSERT; driver `total_deliveries++`; wallet credited with `driver_earnings + reward_bonus`; OTP/photo verified; notification sent |
| → `cancelled` | `cancelled_at` | `cancel_reason`, `cancelled_by` set; notification sent |

### 9.3 Realtime Events

| Event | Channel | Payload |
|-------|---------|---------|
| New order | `store-orders-{profileId}` | Full order row |
| Status update | `store-order-{orderId}` | Updated order row |
| Driver location | `store-driver-loc-{orderId}` | `driver_locations` row |

### 9.4 Notification Events Per Status

| Status | Store Owner | Customer | Driver | Admin |
|--------|:-----------:|:--------:|:------:|:-----:|
| `driver_accepted` | ✅ | ✅ | ✅ | — |
| `driver_arrived_store` | ✅ | ✅ | ✅ | — |
| `picked_up` | ✅ | ✅ | ✅ | — |
| `on_the_way` | ✅ | ✅ | ✅ | — |
| `driver_arrived_destination` | ✅ | ✅ | ✅ | — |
| `delivered` | ✅ | ✅ | ✅ | — |
| `cancelled` | ✅ | ✅ | ✅ | — |
| Issue reported | ✅ | — | ✅ | ✅ |

### 9.5 Customer bypass of `complete_delivery` RPC

The customer order detail screen (`(customer)/[orderId].tsx` line 110-113) uses:
```typescript
const confirmDelivery = async () => {
  await supabase.from('delivery_orders').update({ status: 'delivered' }).eq('id', orderId);
};
```

This is **incorrect** — it:
- Bypasses atomic `complete_delivery` RPC
- Skips OTP/photo verification
- Does NOT credit driver wallet
- Does NOT increment `total_deliveries`
- Does NOT insert into `order_status_history`
- However, the Realtime `trg_notify_order_status` trigger WILL fire (UPDATE of status column)

---

## 10. Rewards Audit

### 10.1 Current Implementation

| Component | Status |
|-----------|--------|
| `reward_bonus` column on `delivery_orders` | ✅ Added by migration 048 |
| Driver `rewards.tsx` screen | ✅ Achievements dashboard |
| Reward shown in driver order cards | ✅ |
| Reward shown in delivery summary | ✅ |
| Rewarded in wallet on delivery | ✅ Via `complete_delivery` (driver_earnings + reward_bonus) |
| **Achievements database table** | ❌ **Not implemented** |
| **Loyalty/points system** | ❌ **Not implemented** |
| **Store-side rewards** | ❌ **Not implemented** |

### 10.2 How Rewards Currently Work

1. `reward_bonus` is a static column on `delivery_orders` (set at order creation time)
2. Driver sees the bonus on order cards and in their delivery summary
3. When `complete_delivery` runs, `driver_earnings + reward_bonus` is credited to wallet
4. Achievements in `rewards.tsx` are **purely client-side** — computed from `totalEarnings`, `totalDeliveries`, `weeklyDeliveries`
5. No `achievements` table exists
6. No loyalty points or store-side reward system exists

### 10.3 How Rewards Should Integrate with Store Orders

1. Store sets `reward_bonus` per order to incentivize drivers (frontend field already exists in concept)
2. `reward_bonus` is stored in `delivery_orders` and processed automatically on delivery
3. No changes needed to store screens — the column already exists and is auto-processed

### 10.4 Missing

- Store-facing rewards/loyalty dashboard
- Ability for store to set reward bonus (currently no input field in order-details or review)
- Achievement tracking (no table)
- Customer loyalty points

---

## 11. Ratings Audit

### 11.1 Current State

**Ratings are NOT implemented.** The only rating artifact is:

- `drivers.average_rating DECIMAL(2,1) DEFAULT 0.0 CHECK (0-5)` — column exists in migration 006
- This value is **never updated** — no trigger, no RPC, no application code modifies it
- Displayed in multiple screens (store order detail, customer order detail, driver profile, driver stats)
- Always shows `0.0` for all drivers

### 11.2 Missing Infrastructure

| Component | Status |
|-----------|--------|
| `ratings` / `reviews` table | ❌ Not created |
| `submit_driver_rating` RPC | ❌ Not created |
| Rate driver UI (store & customer) | ❌ Not created |
| Auto-prompt after delivery | ❌ Not created |
| Rating breakdown/history view | ❌ Not created |
| Store rating system | ❌ Not created |

### 11.3 How Store Should Participate

1. **Rate Driver**: After delivery completed, store should be prompted to rate the driver
2. **View Ratings**: Store should see driver rating in order detail (exists — shows `0.0`)
3. **Store Rating** (future): Customers rate stores — not implemented

### 11.4 Required for Phase 3B (from roadmap)

As documented in `specs/roadmap.md`:
1. New migration: Create `driver_ratings` table
2. New RPC: `submit_driver_rating` (SECURITY DEFINER, atomic, recalculates average)
3. New screen: `rate-driver.tsx` (star rating 1-5 + optional review text)
4. Auto-prompt: After delivery summary
5. Update `drivers.average_rating` via trigger or within RPC

---

## 12. Maps Audit

### 12.1 Architecture

```
react-native-maps (MapView, Marker, Polyline, UrlTile)
    │
    └── SharedMap (wrapper, CartoDB tiles, dark/light switching)
            │
            ├── (customer)/addresses/complete-address.tsx  (full-screen, draggable pin)
            ├── (customer)/[orderId].tsx                    (live tracking, 3 markers + 1 polyline)
            ├── (store)/[orderId].tsx                       (live tracking, 3 markers + 1 polyline)
            ├── (driver)/en-route.tsx                       (live tracking, 3 markers + 1 polyline, ref)
            ├── AddressForm.tsx                             (inline map picker)
            └── LocationPickerScreen.tsx                    (standalone map picker)
```

### 12.2 CartoDB Tile Provider

- Light: `https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`
- Dark: `https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`
- Free for development, no API key, no referrer restrictions
- Fixed in recent session (was `tile.openstreetmap.org` which returned 403)

### 12.3 Map Patterns

| Screen | Mode | Markers | Polyline | Ref |
|--------|------|---------|----------|-----|
| complete-address | Selection | 1 (draggable) | ❌ | ❌ |
| customer/[orderId] | Tracking | 3 (driver, pickup, delivery) | driver→delivery | ❌ |
| store/[orderId] | Tracking | 3 (driver, pickup, delivery) | driver→pickup | ❌ |
| driver/en-route | Tracking | 3 (driver, store, customer) | pickup→delivery | ✅ |
| AddressForm | Selection | 1 (draggable) | ❌ | ❌ |
| LocationPickerScreen | Selection | 1 (draggable) | ❌ | ✅ |

### 12.4 Coordinate Validation

All map screens guard Marker and Polyline rendering with `isValidCoordinate()`:

```typescript
{isValidCoordinate(order.pickup_latitude, order.pickup_longitude) && (
  <Marker coordinate={{ latitude: order.pickup_latitude, longitude: order.pickup_longitude }} />
)}
```

### 12.5 Current Weaknesses

1. **No Google Maps fallback**: `provider={undefined}` works but lacks Google Maps features (street view, place autocomplete, indoor maps)
2. **Raster tiles only**: CartoDB tiles are raster (PNG), not vector — no smooth zooming
3. **Tile loading on slow connections**: No loading/error fallback for tile images
4. **Default center**: Sana'a (15.3694, 44.1910) is hardcoded in AddressForm and LocationPickerScreen as initial map center
5. **No fitToCoordinates**: `en-route.tsx` uses `initialRegion` instead of fitting to show all markers
6. **Duplicate SharedMap usage**: 6 separate instances, each with its own configuration — no central map screen component
7. **No clustering**: For driver order screens showing multiple orders on map

---

## 13. Shared Components Audit

### 13.1 Component Inventory (27 files)

### UI Primitives (10)

| Component | Used? | Store Should Reuse? |
|-----------|-------|---------------------|
| `Avatar.tsx` | ✅ Active | ✅ Yes |
| `Button.tsx` | ✅ Active | ✅ Yes (currently not used in store — uses inline TouchableOpacity) |
| `Card.tsx` | ✅ Active | ✅ Yes (currently not used in store — uses inline styles) |
| `EmptyState.tsx` | ✅ In AddressList | ✅ Yes |
| `LoadingScreen.tsx` | ✅ In AddressList | ✅ Yes |
| `ScreenLayout.tsx` | ⚠️ Rarely used | ✅ Yes (standardize future screens) |
| `SettingsRow.tsx` | ✅ In driver settings | ✅ Yes (for store settings) |
| `SharedMap.tsx` | ✅ 6 instances | ✅ Already using |
| `StatusBadge.tsx` | ⚠️ Exists but not used in store | ✅ Yes (replace inline badges) |
| `TabIcon.tsx` | ✅ All layouts | ✅ Already using |

### Screen-Level Components (12)

| Component | Used by Store? | Notes |
|-----------|---------------|-------|
| `AddressCard.tsx` | ✅ via AddressList | Shared |
| `AddressForm.tsx` | ✅ add-address.tsx | Shared (inline map picker) |
| `AddressList.tsx` | ✅ select-address.tsx | Shared |
| `BackButton.tsx` | Not in store | Use for missing screens |
| `ConversationsScreen.tsx` | ✅ conversations.tsx | Shared |
| `LocationPickerScreen.tsx` | ✅ location-picker.tsx | Shared |
| `NotificationsButton.tsx` | ✅ _layout.tsx header | Shared |
| `OrderDetailForm.tsx` | ✅ order-details.tsx | Shared |
| `OrderReviewCard.tsx` | ✅ review.tsx | Shared |
| `PhoneLookupInput.tsx` | ⚠️ Exists but not used | Store uses inline lookup in create-order/index.tsx |
| `ProfileScreen.tsx` | ✅ profile.tsx | Shared |
| `SignOutButton.tsx` | ✅ _layout.tsx header | Shared |

### Driver-Specific (5) — NOT for Store

| Component | Reason |
|-----------|--------|
| `AvailableOrdersSection.tsx` | Driver-only |
| `DriverHeader.tsx` | Driver-only |
| `DriverPerformanceSummary.tsx` | Driver-only |
| `DriverQuickActions.tsx` | Driver-only |
| `DriverStatsGrid.tsx` | Driver-only |

### 13.2 Store Currently NOT Reusing (But Should)

| Component | Current Store Pattern | Should Be |
|-----------|---------------------|-----------|
| `Button.tsx` | Inline TouchableOpacity with manual styling | Use shared Button |
| `Card.tsx` | Inline View with border/background styles | Use shared Card |
| `StatusBadge.tsx` | Inline View with statusColor logic | Use shared StatusBadge |
| `PhoneLookupInput.tsx` | Inline phone input + search button in create-order/index.tsx | Use shared component (same pattern exists) |

### 13.3 New Components Store Should Create

| Component | Purpose |
|-----------|---------|
| `StoreDashboardHeader.tsx` | Store home screen header (greeting, notifications, stats) |
| `StoreStatsGrid.tsx` | Active orders, today's deliveries, earnings, rating grid |
| `StoreQuickActions.tsx` | New Order, Orders, Customers, Wallet quick links |
| `StoreOrderCard.tsx` | Order card with customer name, route, status, fee |
| `CustomerListItem.tsx` | Customer row for customer directory |

---

## 14. Existing Design System

### 14.1 Theme Usage Verification per Store Screen

| Store Screen | `useColors()` | `spacing` | `fontSize` | `borderRadius` | `fontWeight` | MaterialIcons + ICONS | Shared Button | Shared Card |
|---|---|---|---|---|---|---|---|---|
| `_layout.tsx` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `index.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (inline) | ❌ (inline) |
| `[orderId].tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (inline) | ❌ (inline) |
| `profile.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `create-order/index.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (inline) | ❌ (inline) |
| `create-order/select-address.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (inline) | ❌ (inline) |
| `create-order/add-address.tsx` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `create-order/order-details.tsx` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `create-order/review.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (inline) | ❌ (inline) |
| `create-order/location-picker.tsx` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Observation**: Every store screen uses `useColors()` correctly, but **none** use the shared `Button.tsx` or `Card.tsx` components. All buttons and cards are inline-styled `TouchableOpacity` and `View` elements. This is consistent with the rest of the app (driver screens also use inline styling).

### 14.2 Design System Components Used

| Design Token | Store Usage |
|-------------|-------------|
| `useColors()` | ✅ Every screen |
| `spacing.*` | ✅ Most screens |
| `fontSize.*` | ✅ Most screens |
| `borderRadius.*` | ✅ Most screens |
| `fontWeight.*` | ✅ Most screens |
| MaterialIcons + `ICONS.*` | ✅ Every screen with icons |
| `Button.tsx` | ❌ Never used in store (or anywhere except possibly driver screens) |
| `Card.tsx` | ❌ Never used in store |
| `StatusBadge.tsx` | ❌ Not used (inline badges created) |
| `ScreenLayout.tsx` | ❌ Not used |
| `EmptyState.tsx` | ✅ Used via `AddressList` |
| `LoadingScreen.tsx` | ✅ Used via `AddressList` |
| `Avatar.tsx` | ❌ Not used in store |
| `BackButton.tsx` | ❌ Not used (built-in router back) |

### 14.3 Recommended Pattern for New Store Screens

```typescript
import { useColors } from '../../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../../src/theme/spacing';
import { ICONS } from '../../../../src/constants/icons';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { ScreenLayout } from '../../../../src/components/ui/ScreenLayout';
import { StatusBadge } from '../../../../src/components/ui/StatusBadge';
```

---

## 15. Missing Store Features

### 15.1 Complete Missing List

| # | Feature | Priority | Spec Reference | Notes |
|---|---------|----------|---------------|-------|
| 1 | **Store Dashboard / Home** | P0 | store-module.md §3 | Stats, quick actions, recent orders |
| 2 | **Order Cancel** | P0 | store-module.md §4.3 | Cancel button in order detail before driver accepts |
| 3 | **Store Wallet** | P0 | store-module.md §7 | Balance, transactions, period earnings |
| 4 | **Customer Directory** | P1 | store-module.md §5 | List of past customers, contact details |
| 5 | **Order History / Archive** | P1 | store-module.md §4.2 | Filterable order history |
| 6 | **Rate Driver** | P1 | roadmap Phase 3B | Star rating + review after delivery |
| 7 | **Store Profile / Settings** | P1 | — | Edit business info, hours, delivery zones |
| 8 | **Reports / Analytics** | P2 | store-module.md §8 | Daily/weekly/monthly stats, export |
| 9 | **Store Rewards / Loyalty** | P2 | — | Create promotions, loyalty program |
| 10 | **Staff Management** | P2 | — | `store_staff` table exists but no UI |
| 11 | **Store Ratings View** | P2 | — | See how customers rate the store |
| 12 | **Notification Templates** | P3 | — | Custom notification messages |
| 13 | **Support / Ticket View** | P3 | store-module.md §9 | View customer support tickets |
| 14 | **Multi-Store Management** | Future | — | If store owner has multiple locations |
| 15 | **Bulk Order Creation** | Future | — | CSV/API import |
| 16 | **Scheduled Orders** | Future | — | `OrderPriority` has `scheduled` in TS but not SQL |

### 15.2 Priority Definitions

- **P0**: Blocks core store functionality — must implement
- **P1**: Significant business value — should implement in Phase 1
- **P2**: Enhancement — implement after core
- **P3**: Nice-to-have — implement later
- **Future**: Not planned for initial store system

---

## 16. Dependency Graph

```
Store Module
  │
  ├── MUST exist → Auth System (auth-store.ts, supabase.ts, profiles)
  ├── MUST exist → Orders (delivery_orders table, RLS, RPCs)
  │     ├── depends on → Customers (customers table, customer_addresses)
  │     │     └── depends on → RPC Bypass (get_customer_info, get_customer_addresses — 060)
  │     ├── depends on → Drivers (drivers table, assignment)
  │     │     └── assigns → Driver Module (accept, pickup, deliver lifecycle)
  │     ├── depends on → Realtime (postgres_changes subscriptions)
  │     ├── triggers → Notifications (notify_order_status_change trigger)
  │     │     └── delivered via → Push Tokens (push_tokens table)
  │     └── triggers → Wallet (complete_delivery credits driver wallet)
  ├── integrates → Chat (conversations, messages, useConversation hook)
  ├── integrates → Maps (SharedMap, Marker, Polyline)
  └── will integrate → Ratings (future: driver_ratings table)
      └── will integrate → Rewards (future: achievements, loyalty)

Dependency Flow (bottom-up):
  Auth → Profile → Store Role → Orders → Assignments → Driver → Notifications → Wallet → Chat → Maps → (Ratings) → (Rewards)
```

### 16.1 Circular Dependency Risk

None detected. The graph is acyclic:
- Store creates order → System assigns driver → Driver delivers → System credits wallet
- Store ↔ Customer is mediated by orders (no direct coupling)
- Chat, Maps, Notifications are independent leaf modules consumed by screens

---

## 17. Risks

### 17.1 Database Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| New migration conflicts with existing 060 | Medium | Low | Always use `IF NOT EXISTS`, additive columns only |
| Modifying RLS policies breaks customer lookup | High | Low | RPC approach (060) is correct; never weaken RLS |
| Adding columns to `delivery_orders` exceeds row width | Medium | Low | Already 47+ columns; use JSONB for sparse metadata |
| `scheduled` OrderPriority doesn't exist in DB | Medium | High (`scheduled` \| 1) | **Fix**: Either add to SQL enum or remove from TS type |

### 17.2 Realtime Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Channel name collision | Low | Low | Use unique names per context (`store-orders-{id}`) |
| Realtime disconnection during order creation | Medium | Low | Order creation is RPC-based, not dependent on realtime |
| Unread notification count stale closure | Low | Medium | Fix `use-notifications-list.ts` line 52 closure bug |
| Subscription memory leak on navigation | Medium | Low | All effects have cleanup; verify on complex navigation flows |

### 17.3 Navigation Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Adding new store screens breaks tab layout | Medium | Low | Use `href: null` for non-tab screens (driver pattern) |
| Deep link to order not found | Low | Medium | Show "Order not found" with back button (driver pattern) |
| useFocusEffect + useMemo + StyleSheet interaction | Low | Medium | Store `index.tsx` recreates styles in useMemo — acceptable but watch for perf |

### 17.4 RLS Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Store cannot see customer without order history | High | Resolved | Client no longer queries customers table directly (uses RPC since 060) |
| Store cannot insert address for customer | High | Resolved | `store_insert` policy exists (059,060) |
| Store cannot read customer addresses | High | Resolved | `get_customer_addresses` RPC exists (060) |
| Driver location not visible to store | High | Resolved | `store_select_driver_location` policy exists (039) |
| New store screen needs access to new data | Medium | Ongoing | Follow pattern: create SECURITY DEFINER RPC + grant permission |

### 17.5 Performance Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Order list grows unbounded | Low | Low | All selects are ordered by `created_at DESC`; no pagination yet |
| StyleSheet recreation in useMemo | Low | Medium | Only in store `index.tsx`; use `useMemo` correctly |
| Realtime channel per order detail screen | Low | Low | Channel is per-order, cleanup on unmount |
| Driver location updates on every GPS tick | Medium | Low | 5s interval, 20m distance filter in `useDriverLocation` |

### 17.6 UI Consistency Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| New store screens use inline TouchableOpacity instead of shared Button | Low | High | Consistent with existing pattern; acceptable |
| Status badge coloring diverges per screen | Medium | Medium | Use `StatusBadge.tsx` for consistency |
| Coordinate validation missing from new screen | High | Medium | Always use `isValidCoordinate` before rendering markers/polylines |
| Theme colors accessed differently | Low | Low | Every screen uses `useColors()` — consistent |
| i18n not applied to new screens | Medium | Medium | New screens must use `useTranslation()` |

### 17.7 Risk Summary

| Risk Level | Count | Action |
|------------|-------|--------|
| Critical | 0 | — |
| High | 3 | Fix `scheduled` enum mismatch; fix customer delivery confirmation; always validate coordinates |
| Medium | 8 | Watch for in implementation |
| Low | 6 | Acceptable |

---

## Final Assessment

### 1. Project Readiness: **78%**

The project has a solid foundation: auth, realtime, maps, chat, notifications, wallet, theme, shared components, database with 60 migrations. Major missing pieces: ratings system, store dashboard, store wallet, customer directory, reports.

### 2. Store Readiness: **40%**

Store create-order flow is complete and functional. Missing: dashboard, wallet, cancel order, customer directory, store settings, staff management, reports, ratings input, rewards/loyalty. The store module has 12 files but needs approximately 15+ more screens to be feature-complete.

### 3. Database Readiness: **85%**

The database fully supports the store via:
- `stores` and `store_staff` tables
- `delivery_orders` with full lifecycle columns
- `customer_addresses` with `store_insert` policy + RPCs (060)
- Wallet support via `wallets` table (auto-created per profile)
- Chat via `conversations`/`messages` with auto-create triggers
- Notifications via triggers on status change

Gaps: No `ratings` table, no `achievements` table, no `store_settings` table.

### 4. Recommended Implementation Order

| Phase | Features | Effort |
|-------|----------|--------|
| **Phase 0 — Fixes** | Fix `scheduled` enum mismatch; fix customer confirmDelivery RPC; fix notification-settings persistence | 1-2 days |
| **Phase 1 — Core Store** | Store dashboard; order cancel; store wallet screen | 3-4 days |
| **Phase 2 — Management** | Customer directory; order history/filter; store profile/settings | 3-4 days |
| **Phase 3 — Ratings** | `driver_ratings` migration; rate-driver screen; auto-prompt | 2-3 days |
| **Phase 4 — Enhancement** | Reports/analytics; staff management; store rewards | 3-4 days |
| **Phase 5 — Polish** | Notification settings; support tickets; bulk operations | 2-3 days |

### 5. Things That MUST NOT Be Modified

| Item | Reason |
|------|--------|
| `auth.users` | Supabase-managed — never touch |
| `order_status_history` | Append-only audit log — schema frozen |
| Existing RLS policies | Security-critical — only add, never remove or weaken |
| Existing RPC function signatures | Hooks and services depend on exact parameter names |
| `delivery_orders` primary key / foreign key structure | Referential integrity |
| `customer_addresses` existing columns | Customer and store screens depend on them |
| `profiles` core columns | Auth flow depends on them |
| `stores` column names | TypeScript types match exactly |
| Migration files (existing) | Never edit committed migrations — always create new |

### 6. Things Safe to Extend

| Item | How |
|------|-----|
| `delivery_orders` | Add nullable columns for store-specific data |
| `stores` | Add operating_hours, delivery_radius, logo updates |
| `store_staff` | Add permissions flags |
| `customer_addresses` | Add optional fields (already extended by 059) |
| `profiles` | Add optional columns (prefer role-specific tables) |
| New RPC functions | Create with SECURITY DEFINER, parameter naming convention `p_*` |
| New migrations | Follow existing naming: `{number}_{description}.sql` |
| New route groups | Follow `(app)/(store)/` pattern with `href: null` for non-tab screens |
| New Zustand stores | Follow `create-order-store.ts` pattern |
| New custom hooks | Follow `use-chat.ts` pattern with cancellation + realtime |

### 7. Final Recommendation

**The project is ready for Store System implementation.** The foundation is solid:

- **Database**: 85% ready — stores, orders, addresses, wallet, chat, notifications all exist
- **Backend**: All RPCs are SECURITY DEFINER, RLS is comprehensive, triggers handle side effects
- **Frontend**: 3 Zustand stores, 10 custom hooks, 27 shared components, 10 theme files, 2 locales
- **Patterns**: Driver module provides 15+ proven patterns to replicate
- **Integration**: Chat, maps, notifications, wallet all plug-and-play for store

**Critical blockers** (must fix before proceeding):
1. TS type `OrderPriority` includes `'scheduled'` but SQL enum doesn't — fix to match
2. Customer `[orderId].tsx` uses direct Supabase update for delivery confirmation instead of `complete_delivery` RPC — breaks wallet credit, verification, and audit trail
3. `notification-settings.tsx` UI state not persisted — add persistence before store reuses it

**High-priority store features** (Phase 1):
1. Store dashboard with stats + quick actions (replicate `driver/index.tsx` pattern)
2. Order cancel button in `[orderId].tsx`
3. Store wallet screen (replicate `driver/wallet.tsx` pattern)
4. Fix notification-settings persistence
