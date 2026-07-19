# Document 1: New Components Specification

## Design System Conventions (used by all components)

| Category | Token Pattern | Example Usage |
|----------|---------------|---------------|
| Colors | `useColors()` return value | `colors.primary`, `colors.surface` |
| Spacing | `spacing.xs/sm/md/lg/xl/xxl/xxxl` | `spacing.md` (16) |
| Font size | `fontSize.xxs/xs/sm/md/lg/xl/xxl/xxxl/hero` | `fontSize.md` (16) |
| Font weight | `fontWeight.normal/medium/semibold/bold` | `fontWeight.semibold` |
| Border radius | `borderRadius.sm/md/lg/xl/full` | `borderRadius.lg` (16) |
| Shadows | `shadow.sm/md/lg` | `shadow.md` |
| Icons | `MaterialIcons` via `ICONS` map + `IconName` type | `ICONS.location` |

All StyleSheets MUST use `useColors()` at render time (inside the component body, via `const colors = useColors()`) — never the static `colors` import, to respect dark mode. Static values (like `#fff` for text-on-primary) are acceptable only when the background is a semantic color with known contrast.

---

## Component 1: AddressCard

**File:** `mobile/src/components/AddressCard.tsx`

### Props Interface

```typescript
interface AddressCardProps {
  id: string;
  label: string | null;
  addressText: string;
  landmark: string | null;
  apartment: string | null;
  floor: string | null;
  isDefault: boolean;
  /** If true, show a check/selection indicator */
  selected?: boolean;
  /** Called when the card is pressed */
  onPress?: (id: string) => void;
  /** Called when edit action is tapped */
  onEdit?: (id: string) => void;
  /** Called when delete action is tapped */
  onDelete?: (id: string) => void;
  /** Called when set-as-default action is tapped */
  onSetDefault?: (id: string) => void;
  /** Hide action buttons (for display-only contexts) */
  readonly?: boolean;
}
```

### Renders

```
┌──────────────────────────────────────────┐
│ [icon] Home                    [check]   │  ← label + selected indicator
│                                          │
│  123 Main St, Apt 4B                     │  ← addressText
│  📍 Near the park                        │  ← landmark (if present)
│                                          │
│  [Edit] [Delete] [Set as Default]        │  ← action row (hidden when readonly)
└──────────────────────────────────────────┘
```

### Used By
- `AddressList` (parent composition)
- `ReviewScreen` (readonly mode to display chosen address)
- `Profile → Customer addresses` section (edit/delete mode)

### Design Tokens Used
| Element | Token |
|---------|-------|
| Card background | `colors.surface` |
| Card border | `colors.border` |
| Border radius | `borderRadius.lg` |
| Card padding | `spacing.md` |
| Card margin bottom | `spacing.sm` |
| Label text | `fontSize.md`, `fontWeight.semibold`, `colors.text` |
| Address text | `fontSize.sm`, `colors.textSecondary` |
| Landmark text | `fontSize.xs`, `colors.textTertiary` |
| Default badge bg | `colors.primaryLight` |
| Default badge text | `colors.primaryDark`, `fontSize.xxs`, `fontWeight.semibold` |
| Selected border | `colors.primary`, `borderWidth: 2` |
| Selected check icon | `ICONS.checkCircle`, `colors.primary` |
| Action button text | `fontSize.sm`, `fontWeight.medium` |
| Delete action color | `colors.danger` |
| Edit action color | `colors.info` |
| Set default color | `colors.primary` |
| Internal gap (icon+text) | `spacing.sm` |
| Section gap between rows | `spacing.xs` |

---

## Component 2: AddressList

**File:** `mobile/src/components/AddressList.tsx`

### Props Interface

```typescript
interface AddressListProps {
  addresses: AddressItem[];
  selectedId?: string;
  loading?: boolean;
  error?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSetDefault?: (id: string) => void;
  onAddNew?: () => void;
  readonly?: boolean;
}

interface AddressItem {
  id: string;
  label: string | null;
  address_text: string;
  landmark: string | null;
  apartment: string | null;
  floor: string | null;
  is_default: boolean;
}
```

### Renders

```
┌───────────────────────────────────────────────┐
│  Saved Addresses                  [+ Add New]  │  ← header row
├───────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐  │
│  │  AddressCard (selected?)                │  │  ← iterates addresses
│  └─────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────┐  │
│  │  AddressCard                            │  │
│  └─────────────────────────────────────────┘  │
│  ...                                          │
│                                               │
│  OR [EmptyState] when addresses.length === 0  │
│     "No saved addresses"                      │
│     "Add an address to get started"           │
└───────────────────────────────────────────────┘
```

When `loading === true`, render `LoadingScreen` or skeleton placeholders.
When `error` is set, render an inline error banner.

### Used By
- `CustomerLookupScreen` (select saved address → proceed to order details)
- `Profile → Customer addresses` (manage addresses)

### Design Tokens Used
| Element | Token |
|---------|-------|
| Section title | `fontSize.lg`, `fontWeight.bold`, `colors.text` |
| Add new button | `colors.primary`, `fontSize.sm`, `fontWeight.semibold` |
| Add new icon | `ICONS.add` |
| List gap | `spacing.sm` between cards |
| Loading state | Reuses `LoadingScreen` component |
| Empty state | Reuses `EmptyState` component |
| Error text | `fontSize.sm`, `colors.danger` |
| Container padding | `spacing.md` (if standalone) |

---

## Component 3: AddressForm

**File:** `mobile/src/components/AddressForm.tsx`

### Props Interface

```typescript
interface AddressFormProps {
  /** Initial values for edit mode */
  initialValues?: {
    label: string;
    address_text: string;
    latitude: number;
    longitude: number;
    landmark: string;
    apartment: string;
    floor: string;
    notes: string;
  };
  onSubmit: (values: AddressFormValues) => Promise<void>;
  onCancel?: () => void;
  /** Title for the submit button */
  submitLabel?: string;
  loading?: boolean;
  error?: string;
}

interface AddressFormValues {
  label: string;
  address_text: string;
  latitude: number;
  longitude: number;
  landmark: string;
  apartment: string;
  floor: string;
  notes: string;
}
```

### Renders

```
┌──────────────────────────────────────────┐
│  Address Label                           │
│  [________________________]              │  ← TextInput, placeholder: "Home / Work"
│                                          │
│  Address *                               │
│  [________________________]              │  ← TextInput, multiline optional
│  [📍 Pick on Map]                        │  ← navigates to LocationPickerScreen
│                                          │
│  Apartment / Floor                       │
│  [__________] [__________]               │  ← side-by-side inputs
│                                          │
│  Landmark                                │
│  [________________________]              │
│                                          │
│  Notes                                   │
│  [________________________]              │  ← new `notes` column
│                                          │
│  [Cancel]        [Save Address]          │  ← button row
└──────────────────────────────────────────┘
```

### Used By
- `LocationPickerScreen` (after picking a point on map, return here with coords filled)
- `Profile → Add new address` (standalone form)
- `Profile → Edit address` (pre-filled form)

### Design Tokens Used
| Element | Token |
|---------|-------|
| Label text | `fontSize.sm`, `fontWeight.semibold`, `colors.text` |
| Input background | `colors.surface` |
| Input border | `colors.border` |
| Input border radius | `borderRadius.md` |
| Input padding | `spacing.md` |
| Input text | `fontSize.md` |
| Pick on Map button | `colors.primary`, `fontSize.sm` |
| Row gap | `spacing.sm` between Apartment and Floor |
| Section gap | `spacing.md` between form fields |
| Button primary | Uses `Button` component with `variant="primary"` |
| Button outline | Uses `Button` component with `variant="outline"` |
| Error text | `fontSize.sm`, `colors.danger` |

---

## Component 4: LocationPickerScreen (Full-Screen Map Picker)

**File:** `mobile/src/components/LocationPickerScreen.tsx`

**NB:** This is both a screen and a component. It lives in `components/` but is navigated to via `router.push()` from Expo Router. The caller passes params via the URL query or a shared store.

### Props Interface

```typescript
// Params received via route:
interface LocationPickerParams {
  /** Latitude to initialize the map at */
  initialLat?: number;
  /** Longitude to initialize the map at */
  initialLng?: number;
  /** Title text shown in the header */
  title?: string;
}

// Callback via router back + route params:
interface LocationPickerResult {
  latitude: number;
  longitude: number;
  addressText: string;
}
```

**Communication pattern:** The screen receives params via Expo Router's `useLocalSearchParams()`. When the user confirms a location, it calls `router.navigate('..', { selectedLat: ..., selectedLng: ..., selectedAddress: ... })` and the calling screen reads the result from `useLocalSearchParams()`.

### Renders

```
┌──────────────────────────────────────────┐
│  ← Back     Select Delivery Location      │
├──────────────────────────────────────────┤
│                                          │
│         ┌────────────────────┐           │
│         │                    │           │
│         │   FULL SCREEN MAP  │           │
│         │   with draggable   │           │
│         │   pin / crosshair  │           │
│         │                    │           │
│         └────────────────────┘           │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ Current: 123 Main St, City       │    │  ← reverse-geocoded
│  └──────────────────────────────────┘    │
│                                          │
│          [🔍 Use Current Location]       │
│          [✓ Confirm Location]            │
└──────────────────────────────────────────┘
```

### Behavior
1. On mount, center map on `initialLat/initialLng` or request device location permission
2. User pans map — a crosshair/pin stays centered
3. On pan end, reverse-geocode the center coordinate to get address text
4. "Use Current Location" button locates device and centers map there
5. "Confirm Location" navigates back with `{ selectedLat, selectedLng, selectedAddress }`
6. The `SharedMap` component is used with a custom `Marker` at center

### Used By
- `AddressForm` (via "Pick on Map" button)
- `NewOrderFlow` (when no saved address exists)

### Design Tokens Used
| Element | Token |
|---------|-------|
| Background | `colors.background` |
| Address card bg | `colors.surface` |
| Address card border | `colors.border` |
| Address card radius | `borderRadius.lg` |
| Address text | `fontSize.md`, `colors.text` |
| Button: Confirm | Uses `Button variant="primary" size="lg"` |
| Button: Current Loc | Uses `Button variant="outline"` |
| Center pin icon | `ICONS.location`, `colors.primary`, size `fontSize.xxxl` |
| Pin container | Absolute positioned at screen center |
| Header | Standard `SafeAreaView` + `TouchableOpacity` back |

---

## Component 5: PhoneLookupInput

**File:** `mobile/src/components/PhoneLookupInput.tsx`

### Props Interface

```typescript
interface PhoneLookupInputProps {
  onCustomerFound: (customer: CustomerLookupResult) => void;
  onCustomerNotFound: (phone: string) => void;
  loading?: boolean;
  error?: string;
}

interface CustomerLookupResult {
  id: string;
  full_name: string;
  phone: string;
  addresses: CustomerAddressRow[];
}
```

### Renders

```
┌──────────────────────────────────────────┐
│  Customer Phone                          │
│  [____________] [🔍 Search]              │  ← TextInput + search button
│                                          │
│  OR                                      │
│                                          │
│  Enter customer phone number to start    │
└──────────────────────────────────────────┘
```

On search, calls `ensure_customer_by_phone` RPC. If the returned UUID corresponds to a customer with `profile_id`, also fetches their saved addresses from `customer_addresses` and returns them in `CustomerLookupResult.addresses`. The screen decides next step based on whether addresses exist.

### Used By
- `CustomerLookupScreen` (first step in the new create-order flow)

### Design Tokens Used
| Element | Token |
|---------|-------|
| Label | `fontSize.sm`, `fontWeight.semibold`, `colors.text` |
| Input | Same as AddressForm input tokens |
| Search button | Uses `Button variant="primary"` or `MaterialIcons ICONS.search` |
| Hint text | `fontSize.sm`, `colors.textSecondary` |
| Section gap | `spacing.lg` |

---

## Component 6: OrderDetailForm

**File:** `mobile/src/components/OrderDetailForm.tsx`

### Props Interface

```typescript
interface OrderDetailFormProps {
  onSubmit: (values: OrderDetailValues) => void;
  initialValues?: Partial<OrderDetailValues>;
  loading?: boolean;
  error?: string;
}

interface OrderDetailValues {
  shipment_type_id: string | null;
  shipment_description: string;
  shipment_weight_kg: string;
  delivery_fee: string;
  payment_method: PaymentMethod;
  priority: OrderPriority;
  notes_for_driver: string;
  delivery_notes: string;  // ← new column
}
```

### Renders

```
┌──────────────────────────────────────────┐
│  Delivery Details                        │
│                                          │
│  Shipment Type                           │
│  [Pill1] [Pill2] [Pill3] [Pill4]        │  ← chip selector from shipment_types
│                                          │
│  Description                             │
│  [________________________]              │  ← multiline
│                                          │
│  Weight (kg)                             │
│  [____________]                          │
│                                          │
│  Pricing                                 │
│  Delivery Fee *                          │
│  [____________]                          │
│                                          │
│  Payment Method                          │
│  ○ Cash  ○ Card  ○ Wallet               │
│                                          │
│  Priority                                │
│  [Normal] [Express] [Scheduled]          │
│                                          │
│  Delivery Notes (visible to customer)    │
│  [________________________]              │  ← new field
│                                          │
│  Notes for Driver                        │
│  [________________________]              │
│                                          │
│  [Continue]                              │
└──────────────────────────────────────────┘
```

### Used By
- `OrderDetailsScreen` (step 3 of the new create-order flow)

### Design Tokens Used
| Element | Token |
|---------|-------|
| Section title | `fontSize.lg`, `fontWeight.bold`, `colors.text` |
| All labels | `fontSize.sm`, `fontWeight.semibold`, `colors.text` |
| All inputs | Same as AddressForm input tokens |
| Chip (active) | `colors.primary` border, `colors.primaryLight` bg |
| Chip (inactive) | `colors.border`, `colors.surface` bg |
| Chip text (active) | `colors.primaryDark`, `fontWeight.semibold` |
| Chip text (inactive) | `colors.text` |
| Radio/selector | `colors.primary` for selected |
| TextArea minHeight | 80, `textAlignVertical: 'top'` |
| Row gap | `spacing.sm` |
| Section gap | `spacing.lg` |
| Button | Uses `Button variant="primary" size="lg"` full width |

---

## Component 7: OrderReviewCard

**File:** `mobile/src/components/OrderReviewCard.tsx`

### Props Interface

```typescript
interface OrderReviewCardProps {
  orderData: ReviewOrderData;
  onEdit?: (section: ReviewSection) => void;
}

type ReviewSection = 'customer' | 'pickup' | 'delivery' | 'details';

interface ReviewOrderData {
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryApartment?: string;
  deliveryFloor?: string;
  deliveryLandmark?: string;
  shipmentTypeName?: string;
  shipmentDescription?: string;
  deliveryFee: number;
  paymentMethod: string;
  priority: string;
  notesForDriver?: string;
  deliveryNotes?: string;
}
```

### Renders

```
┌──────────────────────────────────────────────┐
│  Review Order                          [Edit] │
├──────────────────────────────────────────────┤
│  Customer                                     │
│  Ahmed Mohammed                               │
│  +967 700 000 000                             │
├──────────────────────────────────────────────┤
│  Pickup Location                              │
│  123 Store St, City                      [✎]  │
├──────────────────────────────────────────────┤
│  Delivery Location                            │
│  456 Main St, Apt 4B, Near Park          [✎]  │
├──────────────────────────────────────────────┤
│  Shipment: Small      Fee: 1,500 YER          │
│  Priority: Normal     Method: Cash            │
│  Description: Electronics                     │
│  Delivery Notes: Leave at reception           │
├──────────────────────────────────────────────┤
│  Notes for Driver: Handle with care           │
├──────────────────────────────────────────────┤
│  [✕ Cancel]              [✓ Confirm & Create] │
└──────────────────────────────────────────────┘
```

The "Edit" buttons trigger `onEdit(section)` callback which navigates to the appropriate step screen.

### Used By
- `ReviewScreen` (step 4 of the new create-order flow)

### Design Tokens Used
| Element | Token |
|---------|-------|
| Card container | `colors.surface`, `colors.border`, `borderRadius.lg` |
| Section header | `fontSize.sm`, `fontWeight.semibold`, `colors.textSecondary` |
| Section value | `fontSize.md`, `colors.text` |
| Edit icon | `ICONS.edit`, `colors.textTertiary` |
| Divider | `colors.border`, `height: 1` |
| Card padding | `spacing.md` |
| Section gap | `spacing.md` |
| Cancel button | Uses `Button variant="outline"` |
| Confirm button | Uses `Button variant="primary"` |
| Fee / priority row | `fontSize.sm`, `colors.textSecondary` |

---

## Data Types (existing + new)

### New: `CustomerAddressRow` in `mobile/src/types/database.ts`

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
  notes: string | null;          // ← NEW column
  is_default: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
```

### Modified: `DeliveryOrders` — add `delivery_notes`

```typescript
// Add to DeliveryOrders interface:
delivery_notes: string | null;  // ← NEW column
```

### Modified: `Customers` — add `total_orders`

```typescript
// Add to Customers interface (derived, not a DB column):
// This is computed client-side from delivery_orders count
```

### Register both in `Database` type:

```typescript
customer_addresses: { Row: CustomerAddresses; Insert: Partial<CustomerAddresses>; Update: Partial<CustomerAddresses> };
```
