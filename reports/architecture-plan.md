# Architecture Plan: Customer Address System & Multi-Step Order Creation

---

## 1. Architecture Plan

### 1.1 Current State Assessment

| Area | Status | Notes |
|------|--------|-------|
| Database | `customer_addresses` table **already exists** since migration 005 | Never used in application code |
| TypeScript | `CustomerAddresses` interface **missing** from `database.ts` | Must be added |
| RLS | Customer can only SELECT own addresses; **no INSERT/UPDATE/DELETE** | Must add 3 policies |
| RLS | **Store cannot read** customer addresses | Must add store_select policy |
| Columns | `customer_addresses` missing `notes` column | Must add (ALTER TABLE) |
| Columns | `delivery_orders` missing `delivery_notes` column | Must add (ALTER TABLE) |
| Order Flow | Single-screen monolithic `create-order.tsx` (279 lines) | Must refactor to multi-step |
| Customer Lookup | No phone-based lookup before form submit | Must add at step 1 |
| Address Selection | No saved address selection for registered customers | Must add after lookup |
| Location Picker | No dedicated screen for non-registered customers | Must create |
| Pickup Address | Currently entered manually or via My Location | Store should auto-load own address |
| Customer Profile | Uses shared `ProfileScreen` — no address management | Must add Saved Addresses section |

### 1.2 Key Architectural Decisions

1. **Zustand flow store** (`create-order-store.ts`) — shared state across 6 flow screens instead of URL params (avoids serialization, enables complex objects)
2. **Existing `create-order.tsx` deprecated but kept for one release cycle** — new flow lives in `create-order/` directory
3. **`ensure_customer_by_phone` RPC UNCHANGED** — still called at final order creation, NOT at lookup step
4. **`customer_addresses` table already exists** — we extend it with `notes` column rather than creating new tables
5. **Store auto-loads pickup from store's own address** — no manual pickup entry needed
6. **All new columns are NULLABLE** — zero impact on existing orders

### 1.3 Architecture Diagram

```
                    EXISTING CUSTOMER FLOW
                    ======================
                    Enter Phone
                        │
                        ▼
              ┌─────────────────┐
              │  Phone Lookup   │
              │  (customers     │
              │   table query)  │
              └────────┬────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
      ┌────────────────┐  ┌──────────────────┐
      │ Customer Found │  │  NOT FOUND       │
      │ (has profile)  │  │  (guest/anon)    │
      └────────┬───────┘  └────────┬─────────┘
               │                    │
               ▼                    ▼
      ┌──────────────────┐  ┌──────────────────┐
      │ Select Address   │  │ Location Picker  │
      │ (saved addresses)│  │ (full-screen map) │
      │ OR Add New       │  │ → lat/lng/addr   │
      │ → from AddressForm│  │ → landmark/notes  │
      └────────┬─────────┘  └────────┬─────────┘
               │                    │
               └────────┬───────────┘
                        ▼
               ┌──────────────────┐
               │ Order Details    │
               │ (shipment, fee,  │
               │  notes, priority)│
               └────────┬─────────┘
                        ▼
               ┌──────────────────┐
               │ Review & Create  │
               │ → ensure_customer│
               │   _by_phone RPC  │
               │ → INSERT order   │
               └──────────────────┘
```

### 1.4 Files Not Touched (Zero Risk)

- All driver screens and flows
- All chat screens and flows
- All notification screens and flows
- Real-time subscription logic
- Auth and setup flows
- Wallet system
- Delivery lifecycle RPCs
- Order assignment triggers

---

## 2. Database Extension Plan

### 2.1 What Exists (No Changes)

| Object | Migration | Purpose |
|--------|-----------|---------|
| `customers` table | 005 | Customer records (guest + registered) |
| `customer_addresses` table | 005 | Saved addresses with lat/lng/label/landmark |
| `ensure_customer_by_phone` RPC | 040 | Find-or-create customer by phone |
| `find_customer_by_phone` RPC | 040 | Companion lookup |
| `trg_link_customer_orders` trigger | 040 | Auto-link past orders |
| `trg_link_customer_profile` trigger | 042 | Auto-link on registration |
| Grants on both tables | 031, 032 | SELECT/INSERT/UPDATE/DELETE for authenticated |

### 2.2 What Must Be Added

#### A. TypeScript: `CustomerAddresses` interface

File: `mobile/src/types/database.ts`, after `Customers` interface (line 51):

```typescript
export interface CustomerAddresses {
  id: string;
  customer_id: string;
  label: string | null;
  address_text: string;
  latitude: number;
  longitude: number;
  apartment: string | null;
  floor: string | null;
  landmark: string | null;
  notes: string | null;
  is_default: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
```

#### B. TypeScript: `delivery_notes` on `DeliveryOrders`

Insert after `delivery_landmark` (line 102):
```typescript
  delivery_notes: string | null;
```

#### C. TypeScript: Register in `Database.Tables`

After `customers` entry (line 262):
```typescript
      customer_addresses: { Row: CustomerAddresses; Insert: Partial<CustomerAddresses>; Update: Partial<CustomerAddresses> };
```

#### D. SQL Migration: `059_customer_addresses_extension.sql`

Three changes in one file:

```sql
-- 1. Add notes column to customer_addresses
ALTER TABLE customer_addresses ADD COLUMN notes TEXT;

-- 2. Add delivery_notes column to delivery_orders  
ALTER TABLE delivery_orders ADD COLUMN delivery_notes TEXT;

-- 3. Customer CRUD policies on customer_addresses
CREATE POLICY "customer_insert" ON customer_addresses
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );
CREATE POLICY "customer_update" ON customer_addresses
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  ) WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );
CREATE POLICY "customer_delete" ON customer_addresses
  FOR DELETE USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );

-- 4. Store SELECT policy (for order creation)
CREATE POLICY "store_select" ON customer_addresses
  FOR SELECT USING (
    customer_id IN (
      SELECT customer_id FROM delivery_orders
      WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
         OR store_id IN (SELECT store_id FROM store_staff WHERE profile_id = auth.uid())
    )
  );
```

### 2.3 Backward Compatibility

| Change | Breaking? | Reason |
|--------|-----------|--------|
| ALTER TABLE ADD COLUMN (nullable) | NO | NULL for all existing rows |
| New TypeScript interface | NO | Additive — no existing code imports it |
| New TypeScript property on DeliveryOrders | NO | Optional `string \| null` — compiles clean |
| New RLS policies | NO | Add permissions, don't remove any |
| New migration file | NO | Runs last, all prior migrations unaffected |

**Total breaking changes: 0**

---

## 3. Navigation Flow

### 3.1 Store: Restructured Layout

```
(store)/
  _layout.tsx                    ← REWRITE: from Tabs → Stack(parent)
    ├── (tabs)/_layout.tsx       ← CREATE: move tabs here (minus create-order)
    │   ├── index.tsx            ← MOVE: orders list
    │   ├── conversations.tsx    ← MOVE
    │   ├── profile.tsx          ← MOVE
    │   └── [orderId].tsx        ← MOVE
    └── create-order/
        _layout.tsx              ← CREATE: Stack for 6-step flow
        ├── index.tsx            ← CREATE: phone lookup (entry)
        ├── select-address.tsx   ← CREATE: saved addresses picker
        ├── add-address.tsx      ← CREATE: form for new address
        ├── location-picker.tsx  ← CREATE: full-screen map picker
        ├── order-details.tsx    ← CREATE: shipment/fee/form
        └── review.tsx           ← CREATE: review & create
```

### 3.2 Store: Flow Screens in Detail

| Screen | Route | Purpose |
|--------|-------|---------|
| `create-order/index` | Entry point | Store enters customer phone → lookup |
| `create-order/select-address` | After customer found | Shows saved addresses, "Add New" option |
| `create-order/add-address` | From select-address | Form: label, address, lat/lng, landmark, notes |
| `create-order/location-picker` | After NOT found | Full-screen map: pan, long-press, search, confirm |
| `create-order/order-details` | After address set | Shipment type, description, weight, fee, payment, notes |
| `create-order/review` | Final step | Summary, edit buttons, "Create Order" |

### 3.3 Customer: Address Management

```
(customer)/
  _layout.tsx                    ← EDIT: add href:null for addresses
  ├── index.tsx                  ← UNCHANGED
  ├── conversations.tsx          ← UNCHANGED
  ├── profile.tsx                ← REWRITE: add Saved Addresses section
  └── addresses/
      _layout.tsx                ← CREATE: Stack
      ├── index.tsx              ← CREATE: list with edit/delete/default
      ├── new.tsx                ← CREATE: add address form
      └── [addressId].tsx        ← CREATE: edit/delete address
```

### 3.4 State Sharing

**New file:** `mobile/src/store/create-order-store.ts` — Zustand store for the 6-step flow:

```typescript
interface CreateOrderState {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  isExistingCustomer: boolean;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryApartment: string | null;
  deliveryFloor: string | null;
  deliveryLandmark: string | null;
  deliveryNotes: string | null;
  shipmentTypeId: string | null;
  shipmentDescription: string;
  shipmentWeightKg: string;
  deliveryFee: string;
  paymentMethod: PaymentMethod;
  priority: OrderPriority;
  notesForDriver: string;
  reset: () => void;
  // ...setters for each section
}
```

---

## 4. New Components

| Component | File | Purpose | Used By |
|-----------|------|---------|---------|
| AddressCard | `src/components/AddressCard.tsx` | Display single address with actions | AddressList, Review, Profile |
| AddressList | `src/components/AddressList.tsx` | Scrollable list of AddressCards | select-address screen, Profile |
| AddressForm | `src/components/AddressForm.tsx` | Add/edit address form | add-address screen, Profile |
| LocationPickerScreen | `src/components/LocationPickerScreen.tsx` | Full-screen map for location selection | location-picker screen, AddressForm |
| PhoneLookupInput | `src/components/PhoneLookupInput.tsx` | Phone input with search button | create-order/index |
| OrderDetailForm | `src/components/OrderDetailForm.tsx` | Shipment/fee/payment/notes form | order-details screen |
| OrderReviewCard | `src/components/OrderReviewCard.tsx` | Read-only order summary with edit | review screen |

All components use: `useColors()`, `spacing`/`fontSize`/`borderRadius`/`fontWeight` tokens, `MaterialIcons` via `ICONS` constants, `Button` shared component. No hardcoded colors or values.

---

## 5. Migration Strategy (5 Phases)

### Phase 1: Database (0 frontend changes)
- Run SQL migration `059_customer_addresses_extension.sql`
- Add `CustomerAddresses` type + `delivery_notes` to `database.ts`
- Verify RLS policies work via SQL queries

### Phase 2: Components (testable independently)
- Create all 7 new components under `src/components/`
- Create Zustand store: `src/store/create-order-store.ts`
- Verify each component renders in isolation

### Phase 3: New Screens + Restructure
- Rewrite `(store)/_layout.tsx` to parent Stack
- Create `(store)/(tabs)/_layout.tsx` with moved tabs
- Create `create-order/` directory with all 6 screens
- Customer profile: add Saved Addresses section
- Create `(customer)/addresses/` screens

### Phase 4: Rewire create-order flow
- The original `create-order.tsx` is replaced by the directory
- Old file is deleted
- Tab layout no longer references `create-order.tsx` directly
- "New Order" button now links to `/(app)/(store)/create-order`

### Phase 5: Verification
- TypeScript: `npx tsc --noEmit` = zero errors
- Old create-order path: verify redirect/404
- Phone lookup: test found + not-found paths
- Address CRUD: add/edit/delete/set-default on customer side
- Order creation: complete E2E flow
- Existing orders: verify list still renders

---

## 6. Regression Prevention Plan

### Untouched Files (No Code Changes)

| Area | Files | Risk |
|------|-------|------|
| All driver screens | 23 files in `(driver)/` | None |
| All chat screens | 1 file in `(chat)/` | None |
| All notification screens | 1 file in `(notifications)/` | None |
| Auth flow | `(auth)/login.tsx`, `(auth)/register.tsx`, `auth-store.ts` | None |
| Setup flow | `(setup)/index.tsx` | None |
| Delivery lifecycle RPCs | `delivery-service.ts` | None |
| Realtime subscriptions | All `.subscribe()` calls | None |
| Driver hooks | `use-driver-location.ts`, `use-driver-orders.ts`, etc. | None |
| Geo utilities | `geo.ts` | None |
| Existing orders | All 40k+ delivery_orders rows | None |

### Mutation Safety Rules

1. **All new DB columns are NULLABLE** — existing rows get NULL, no migration default needed
2. **All new RLS policies are additive** — never modify or drop existing policies
3. **Old `create-order.tsx` is deleted, not renamed** — ensures no stale imports
4. **`ensure_customer_by_phone` RPC untouched** — same signature, same behavior
5. **`create-order-store.ts` is ephemeral** — no localStorage, no persistence, resets on create/cancel
6. **`delivery_apartment`/`delivery_floor`/`delivery_landmark` remain optional** — backward compat

### RLS Recursion Analysis

The `store_select` policy on `customer_addresses`:
```sql
customer_id IN (
  SELECT customer_id FROM delivery_orders
  WHERE store_id IN (...)
)
```

This joins: `customer_addresses` → `delivery_orders` → `stores`. No self-referencing join. No recursion possible. Subquery depth = 2, both referencing different tables.

---

## 7. Risk Analysis

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | Store cannot read customer addresses due to RLS | Low | High | Test store_select policy with actual store user before release |
| 2 | Customer cannot INSERT own addresses | Low | High | Test customer_insert/update/delete policies |
| 3 | Missing `CustomerAddresses` type causes TS errors | Medium | Medium | Add type in Phase 1 before any component uses it |
| 4 | `create-order.tsx` deletion breaks navigation | Medium | High | Restructure layout first, delete old file last |
| 5 | Old orders missing `delivery_notes` display as "null" | Low | Low | Use `?? ''` or conditional rendering with `?` |
| 6 | Phone lookup returns wrong customer (duplicate phones) | Low | Medium | DB has unique constraint? No — but `find_customer_by_phone` returns first match |
| 7 | Store staff without `can_create_orders` can access new flow | Low | High | Auth guard checks `store_staff` permissions at layout level |
| 8 | Customer selects address, then changes phone during flow | Low | Low | Phone locked after step 1 (stored in flow state) |
| 9 | Location picker result parsing fails (string → number) | Low | Medium | Use `parseFloat` with fallback, validate before proceeding |
| 10 | Yemen phone number format unsupported | Low | Low | Accept all formats, store as-is (existing behavior preserved) |

### Overall Risk Rating: **LOW**

No existing functionality is modified or removed. All changes are additive (new screens, new columns, new RLS policies).

---

## 8. Implementation Order

```
Phase 1 ─── SQL migration + types
  │         Step 1: Run 059_customer_addresses_extension.sql
  │         Step 2: Add CustomerAddresses type to database.ts
  │         Step 3: Verify npx tsc --noEmit passes
  │
Phase 2 ─── Shared components
  │         Step 4: Create create-order-store.ts
  │         Step 5: Create AddressCard.tsx
  │         Step 6: Create AddressList.tsx
  │         Step 7: Create AddressForm.tsx
  │         Step 8: Create PhoneLookupInput.tsx
  │         Step 9: Create LocationPickerScreen.tsx
  │         Step 10: Create OrderDetailForm.tsx
  │         Step 11: Create OrderReviewCard.tsx
  │
Phase 3 ─── Store flow screens
  │         Step 12: Rewrite (store)/_layout.tsx (parent Stack)
  │         Step 13: Create (store)/(tabs)/_layout.tsx
  │         Step 14: Move existing tab screens into (tabs)/
  │         Step 15: Create create-order/_layout.tsx
  │         Step 16: Create create-order/index.tsx (phone lookup)
  │         Step 17: Create create-order/select-address.tsx
  │         Step 18: Create create-order/add-address.tsx
  │         Step 19: Create create-order/location-picker.tsx
  │         Step 20: Create create-order/order-details.tsx
  │         Step 21: Create create-order/review.tsx
  │         Step 22: Delete old create-order.tsx
  │
Phase 4 ─── Customer address management
  │         Step 23: Rewrite (customer)/profile.tsx (add address section)
  │         Step 24: Create addresses/_layout.tsx
  │         Step 25: Create addresses/index.tsx
  │         Step 26: Create addresses/new.tsx
  │         Step 27: Create addresses/[addressId].tsx
  │
Phase 5 ─── Verification
            Step 28: npx tsc --noEmit
            Step 29: Test all 6 flow paths
            Step 30: Verify existing orders unaffected
            Step 31: Verify driver/chat/notifications unaffected
```

**Estimated new files:** 21  
**Estimated modified files:** 5  
**Estimated deleted files:** 1  
**Files with zero changes:** 90+ (all driver, chat, notification, auth, setup screens)

---

## Summary

The project already has a well-designed database with `customer_addresses`, `customers`, guest customer support via `ensure_customer_by_phone`, and auto-linking triggers. The implementation requires:

1. **1 SQL migration** — add 2 nullable columns + 4 RLS policies
2. **1 TypeScript type** — `CustomerAddresses` interface
3. **7 new components** — all using existing design system tokens
4. **1 Zustand store** — ephemeral flow state
5. **11 new screens** — 6 for store flow, 4 for customer address management, 1 restructured layout
6. **5 file moves** — existing tab screens into `(tabs)/` subdirectory

Zero breaking changes. Zero risk to existing deliveries, drivers, chats, or notifications.
