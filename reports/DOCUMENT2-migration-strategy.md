# Document 2: Migration Strategy

## Overview

The strategy follows a **5-phase plan** designed so that at every phase the app remains buildable and deployable. No commit ever leaves the codebase in a broken state. Phase 4 is the only phase that re-wires existing code; all prior phases are additive.

---

## Phase 1: Database-Only Changes (0 breaking, 100% safe)

**Goal:** Prepare the database schema and permissions so the new code can use them, without affecting any existing query or screen.

### 1.1 Migration 059: Add `notes` to `customer_addresses`

```sql
-- File: supabase/migrations/059_customer_addresses_notes.sql

-- 1. Add notes column (nullable, no default — backwards compatible)
ALTER TABLE public.customer_addresses
  ADD COLUMN notes TEXT;

-- 2. Add store SELECT policy so stores can read addresses of their customers
--    This is needed when a store looks up a customer by phone and wants to
--    fetch their saved addresses.
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

-- 3. Grant store the SELECT permission (already has INSERT from migration 032,
--    but store never needed to SELECT before)
--    Actually, authenticated already has SELECT per migration 032.
--    The RLS policy now restricts what stores can see.
```

**Why this is safe:**
- `notes` is `NULLABLE` — all existing rows get `NULL`, existing INSERTs omit it, existing code never references it
- New RLS policy is additive — existing policies remain unchanged
- The policy only *adds* visibility for stores; it never takes away visibility from customers or admins
- No existing query relies on `customer_addresses` from a store context (current app never queries this table from store screens)

### 1.2 Migration 060: Add `delivery_notes` to `delivery_orders`

```sql
-- File: supabase/migrations/060_delivery_orders_delivery_notes.sql

ALTER TABLE public.delivery_orders
  ADD COLUMN delivery_notes TEXT;
```

**Why this is safe:**
- Same logic: `NULLABLE`, existing INSERTs in create-order.tsx omit it (an explicit column list is used, never `SELECT *` insert), existing SELECT queries that use column lists won't break

### 1.3 Add TypeScript types

Edit `mobile/src/types/database.ts`:

- Add `CustomerAddresses` interface (with `notes` field)
- Add `delivery_notes` to `DeliveryOrders`
- Register `customer_addresses` in the `Database.public.Tables` type

**Why this is safe:**
- Adding types never breaks runtime code
- The `Database` type only becomes *more complete*, not changed for existing consumers

### 1.4 Verification (Phase 1)

1. Run `npx tsc --noEmit` (or the project's typecheck command) — must pass
2. Run the existing migration against a staging DB (no errors)
3. Run `supabase db test` if available
4. Manually confirm `SELECT * FROM customer_addresses` shows `notes` column as `NULL`
5. Manually confirm `SELECT * FROM delivery_orders` shows `delivery_notes` column as `NULL`

---

## Phase 2: New Components (additive, no screen changes)

**Goal:** Build all reusable components from Document 1. Each component is independently testable. No existing screen uses them yet.

### 2.1 Implementation order (bottom-up)

| Step | Component | Depends On |
|------|-----------|------------|
| 2.1 | `CustomerAddresses` type + update `Database` type | Phase 1 |
| 2.2 | `AddressCard` | None (self-contained) |
| 2.3 | `AddressList` | `AddressCard`, `EmptyState`, `LoadingScreen` |
| 2.4 | `LocationPickerScreen` | `SharedMap`, `geo.ts` reverse geocode |
| 2.5 | `AddressForm` | `LocationPickerScreen`, reuses input patterns |
| 2.6 | `PhoneLookupInput` | None (calls `ensure_customer_by_phone` RPC) |
| 2.7 | `OrderDetailForm` | Shipment types fetch pattern (see existing code) |
| 2.8 | `OrderReviewCard` | None (pure display) |

### 2.2 Verification per component

Each component should be verifiable in isolation:

1. **TypeScript:** `npx tsc --noEmit` — no type errors
2. **Lint:** project linter passes
3. **Render test (optional):** Create a temporary test screen in `app/` to verify the component renders with mock data, then delete it
4. **Console/log:** No spurious logs or warnings

### 2.3 File structure additions

```
mobile/src/components/
├── AddressCard.tsx          # NEW
├── AddressList.tsx           # NEW
├── AddressForm.tsx           # NEW
├── LocationPickerScreen.tsx  # NEW
├── PhoneLookupInput.tsx      # NEW
├── OrderDetailForm.tsx       # NEW
├── OrderReviewCard.tsx       # NEW
└── ui/                       # existing — no changes
```

No existing files are modified in this phase.

---

## Phase 3: New Screens (additive, create-order.tsx untouched)

**Goal:** Create the new multi-step screens as new routes. The existing `create-order.tsx` still works. Both flows coexist.

### 3.1 New route structure

```
mobile/app/(app)/(store)/
├── _layout.tsx                # Add new tab screens (hidden from tab bar)
├── index.tsx                  # existing — unchanged
├── create-order.tsx           # existing — UNTOUCHED
├── create-order-flow/
│   ├── _layout.tsx            # Stack navigator for the flow (NEW)
│   ├── customer-lookup.tsx    # Step 1: Phone lookup (NEW)
│   ├── select-address.tsx     # Step 2a: Pick saved address (NEW)
│   ├── location-picker.tsx    # Step 2b: Pick on map (NEW, wraps component)
│   ├── order-details.tsx      # Step 3: Shipment, fee, notes (NEW)
│   ├── review.tsx             # Step 4: Review all (NEW)
│   └── index.tsx              # Redirect to customer-lookup (NEW)
├── conversations.tsx          # existing — unchanged
├── profile.tsx                # existing — unchanged
└── [orderId].tsx              # existing — unchanged
```

### 3.2 Route design decisions

- `create-order-flow/` is a **group** with its own Stack layout
- It is **not** a tab — it's pushed as a modal or stack from the FAB/store index or from the "New Order" tab
- The _layout.tsx for this group provides a stack navigator with header back buttons

### 3.3 Step-by-step screen responsibility

#### `customer-lookup.tsx`
- Renders `PhoneLookupInput`
- On customer found → fetches addresses → if addresses.length > 0 navigate to `select-address`, else navigate to `location-picker`
- On not found → navigate to `location-picker` with just the phone
- **State passed via:** `useLocalSearchParams` or a shared Zustand store (prefer Zustand to avoid URL serialization issues with complex objects)

#### `select-address.tsx`
- Renders `AddressList` with customer addresses
- On select → navigate to `order-details` with chosen address + customer info

#### `location-picker.tsx`
- Renders `LocationPickerScreen` component
- On confirm → navigate to `order-details` with picked location + customer info

#### `order-details.tsx`
- Renders `OrderDetailForm`
- On submit → navigate to `review` with all accumulated data

#### `review.tsx`
- Renders `OrderReviewCard`
- "Confirm & Create" calls the exact same `supabase.from('delivery_orders').insert()` logic as the existing `create-order.tsx`
- On success → `router.replace('..')` (back to store index/orders list)

### 3.4 Shared state (Zustand store)

**New file:** `mobile/src/store/create-order-store.ts`

```typescript
interface CreateOrderState {
  // Step 1: Customer
  customerName: string;
  customerPhone: string;
  customerId: string | null;

  // Step 2: Delivery address
  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryApartment: string | null;
  deliveryFloor: string | null;
  deliveryLandmark: string | null;

  // Step 2: Pickup (pre-filled from store)
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;

  // Step 3: Order details
  shipmentTypeId: string | null;
  shipmentDescription: string;
  deliveryFee: string;
  paymentMethod: PaymentMethod;
  priority: OrderPriority;
  notesForDriver: string;
  deliveryNotes: string;

  // Actions
  setCustomer: (name: string, phone: string, id: string) => void;
  setDeliveryAddress: (addr: Partial<CreateOrderState>) => void;
  setPickupAddress: (addr: Partial<CreateOrderState>) => void;
  setOrderDetails: (details: Partial<CreateOrderState>) => void;
  reset: () => void;
}
```

This store is **reset** on flow entry and **read** on the review screen to construct the INSERT.

### 3.5 Verification (Phase 3)

1. TypeScript compiles
2. Lint passes
3. The "New Order" tab still opens the old `create-order.tsx` — test that flow still works
4. Create a temporary deep link or button to test the new `create-order-flow/customer-lookup` route — verify the full flow works end-to-end
5. Verify all 5 steps render correctly with mock data

---

## Phase 4: Rewire create-order.tsx to New Flow

**Goal:** Replace the old single-screen create order with the new multi-step flow.

### 4.1 Changes to `_layout.tsx` (store tab layout)

```typescript
// Change the create-order tab to point to the new flow:
<Tabs.Screen
  name="create-order-flow/index"  // ← changed from "create-order"
  options={{
    title: 'New Order',
    tabBarIcon: ({ focused }) => <TabIcon icon="createOutline" focused={focused} />,
  }}
/>
```

### 4.2 Changes to `create-order-flow/index.tsx`

This file becomes a **redirect** screen:

```typescript
// Simple redirect to customer-lookup
export default function CreateOrderFlowIndex() {
  useEffect(() => {
    router.replace('./customer-lookup');
  }, []);
  return <LoadingScreen />;
}
```

### 4.3 Remove (or deprecate) old `create-order.tsx`

Option A (clean): Delete `create-order.tsx` from the tab layout and file system.
Option B (safe): Keep the file but remove its tab entry from `_layout.tsx`. Add a comment header: `// DEPRECATED — kept for reference. Remove after QA confirms new flow.`

**Recommended: Option B** for one release cycle, then delete in a follow-up.

### 4.4 Update `index.tsx` (store orders list)

If there's a FAB or button that navigates to create-order, update its href:

```typescript
// OLD:
router.push('/create-order');
// NEW:
router.push('/create-order-flow');
```

### 4.5 Verification (Phase 4)

1. "New Order" tab opens `customer-lookup` screen → not the old form
2. Full flow: Phone lookup → Select address or pick on map → Order details → Review → Create
3. Verify created order in database matches expected values
4. Verify `delivery_notes` is populated if filled in, `NULL` if left blank
5. Old `create-order.tsx` removed from tab bar — no dead links

---

## Phase 5: Customer Address Management (Profile Section)

**Goal:** Allow store staff to manage customer addresses from the profile section (bonus — not strictly part of order creation, but listed as a requirement).

### 5.1 New screen: `profile/addresses.tsx`

```
mobile/app/(app)/(store)/profile/
├── _layout.tsx        # Stack for profile sub-screens (NEW)
└── addresses.tsx      # Customer address list (NEW)
```

### 5.2 Implementation

1. List all addresses for the current customer using `customer_addresses` table (filtered by `customer_id` from the customer lookup context)
2. Each address renders via `AddressList` with `editable` mode
3. "Add Address" button pushes `AddressForm`
4. Edit/Delete buttons trigger the appropriate Supabase mutations
5. "Set as Default" toggles via a transaction (unset all, set one)

### 5.3 Verification

1. Navigate to profile → "My Addresses" → list renders
2. Add address → form validates and saves
3. Edit address → pre-filled form, updates correctly
4. Delete address → soft-delete confirmed
5. Set default → old default removed, new default set
6. TypeScript + lint pass

---

## Testing & Verification Strategy (cross-phase)

### Type Safety
```bash
npx tsc --noEmit           # TypeScript compilation check
npx eslint . --ext .ts,.tsx  # Lint (adjust command to match project config)
```

### Unit Tests (if Jest is set up)
New components can be tested with React Native Testing Library:

| Component | Tests |
|-----------|-------|
| `AddressCard` | Renders label, address, landmark; fires onPress/onEdit/onDelete; shows selected state |
| `AddressList` | Renders list of cards; shows empty state; shows loading; fires onSelect |
| `AddressForm` | Validates required fields; calls onSubmit with values; shows error |
| `PhoneLookupInput` | Fires onCustomerFound/onCustomerNotFound based on input |
| `OrderDetailForm` | Validates delivery fee is positive; toggles payment/priority selection |
| `OrderReviewCard` | Renders all sections; fires onEdit with section name |

### Integration Test (Manual)
1. **Happy path (customer exists with addresses):**
   - Enter phone → customer found → select saved address → fill details → review → create
   - Verify: order has `customer_id`, correct address, `delivery_notes`

2. **Happy path (new customer, no addresses):**
   - Enter phone → not found → pick on map → fill details → review → create
   - Verify: new customer created, order has `customer_id`

3. **Edge: delivery_notes left blank**
   - Review screen shows `NULL` → create → verify DB has `NULL`

4. **Edge: store staff with `can_create_orders`**
   - Login as store staff → create order → must work (same RLS policy)

5. **Edge: Back navigation**
   - Go back from review → edit details → continue → review still shows updated data

6. **Regression: Old order detail screen**
   - Open any existing order → must show normally, no crash

### Database Verification
```sql
-- Verify new columns
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name IN ('customer_addresses', 'delivery_orders')
  AND column_name IN ('notes', 'delivery_notes');

-- Verify store can see customer addresses (after Phase 1 migration)
SELECT * FROM customer_addresses
WHERE customer_id IN (
  SELECT customer_id FROM delivery_orders
  WHERE store_id = '<test_store_id>'
);
LIMIT 5;
```
