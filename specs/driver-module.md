# FullDelivery — Driver Module Product Specification

> **Version:** 1.0  
> **Status:** Draft for Review  
> **Last Updated:** 2026-07-12  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Navigation Flow](#2-navigation-flow)
3. [Screen Specifications](#3-screen-specifications)
4. [Order Status Machine](#4-order-status-machine)
5. [Design System](#5-design-system)
6. [Hooks & Services](#6-hooks--services)
7. [Database Tables Used](#7-database-tables-used)
8. [RPCs Used](#8-rpcs-used)
9. [Realtime Subscriptions](#9-realtime-subscriptions)
10. [Notifications](#10-notifications)
11. [Permissions](#11-permissions)
12. [States: Loading, Empty, Error, Offline](#12-states)
13. [Existing vs Missing](#13-existing-vs-missing)

---

## 1. Overview

The Driver Module is the core operational tool for delivery drivers. It covers the complete lifecycle: accepting orders, navigating to pickup, confirming pickup, navigating to drop-off, verifying delivery, earning tracking, and issue reporting.

### Current State
- **12 screens built** (5 tab screens + 7 hidden navigational screens)
- **Full workflow operational**: acceptance → pickup → en-route → delivery → summary
- **Dark theme** across all screens
- **Realtime** order updates and live driver location tracking
- **Wallet** balance display (basic)
- **Profile** and **Conversations** via shared components

### Roles Involved
- **Driver** — the primary user
- **Store** — provides the pickup
- **Customer** — receives the delivery
- **Admin** — manages driver accounts and documents

---

## 2. Navigation Flow

### 2.1 Tab Structure (Bottom Tab Bar)

```
Home (index)        Orders (orders)     Chat (conversations)    Wallet (wallet)    Profile (profile)
  |                     |                     |                      |                  |
  ├─ Stats Grid         ├─ Available Tab      ├─ Shared Component    ├─ Balance         ├─ Shared Component
  ├─ Online Toggle      ├─ My Orders Tab      └─ (see Shared Specs) └─ (basic only)    └─ (see Shared Specs)
  ├─ Available Orders   ├─ Filter/Sort
  └─ Quick Actions      └─ Accept/Details
```

### 2.2 Hidden Routes (href: null in Tab Layout)

These are pushed programmatically and are not shown in the tab bar:

```
[orderId].tsx            ← Order detail (any status)
confirm-acceptance.tsx   ← Accept an order
pickup-confirmation.tsx  ← Mark picked up
en-route.tsx             ← Active delivery navigation
confirm-delivery.tsx     ← Verify & complete delivery
delivery-summary.tsx     ← Post-delivery summary
report-issue.tsx         ← Report a problem
```

### 2.3 Flow Diagram

```
[Home/Orders]
    │
    ├──► Tap "Accept" ──► [Confirm Acceptance]
    │                           │
    │                      accept_order RPC
    │                           │
    │                    ┌──────┘
    │                    ▼
    │               [Order Detail]  (status: driver_accepted)
    │                    │
    │               "Mark as Arrived at Store"
    │               updateStatus('driver_arrived_store')
    │                    │
    │                    ▼
    │               [Order Detail]  (status: driver_arrived_store)
    │                    │
    │               "Confirm Pickup" ──► [Pickup Confirmation]
    │                                          │
    │                                     Photo / Notes / Checkbox
    │                                          │
    │                                    update to 'picked_up'
    │                                          │
    │                    ┌─────────────────────┘
    │                    ▼
    │               [Order Detail]  (status: picked_up)
    │                    │
    │               "Start Delivery" ──► [En Route]
    │                                          │
    │                                    Auto: picked_up → on_the_way
    │                                          │
    │                                     Timeline / Map / Nav
    │                                          │
    │                                    "Mark as Arrived"
    │                                    arriveAtDestination RPC
    │                                          │
    │                    ┌─────────────────────┘
    │                    ▼
    │               [Confirm Delivery]
    │                    │
    │               OTP / Photo / Signature
    │                    │
    │               completeDelivery RPC
    │                    │
    │                    ▼
    │               [Delivery Summary]
    │                    │
    │               "Back to Dashboard"
    │                    │
    └────────────────────┘
```

---

## 3. Screen Specifications

### 3.1 Driver Home (index.tsx)

**Path:** `mobile/app/(app)/(driver)/index.tsx`  
**Status:** ✅ Built

#### Layout
```
┌──────────────────────────────────┐
│  Hi, DriverName  🔔              │  ← Header with notification bell
│  ⚡ Online         [Switch]      │  ← Online/offline toggle
├──────────────────────────────────┤
│  ┌──────┐ ┌──────┐               │
│  │ 📦 3 │ │ ✅ 12 │               │  ← Stats Grid (2×2)
│  └──────┘ └──────┘               │
│  ┌──────┐ ┌──────┐               │
│  │ 👛 $45│ │ ⭐ 4.8│               │
│  └──────┘ └──────┘               │
├──────────────────────────────────┤
│  Available Orders Nearby          │  ← Section title
│  ┌──────────┐ ┌──────────┐       │
│  │ ID: ORD.. │ │ ID: ORD.. │  →   │  ← Horizontal FlatList
│  │ Store→Cus│ │ Store→Cus│       │
│  │ $15 [View]│ │ $20 [View]│      │
│  └──────────┘ └──────────┘       │
├──────────────────────────────────┤
│  Quick Actions                    │
│  🗺️ Browse  👛 Wallet  🎁 Rewards  🕐 History  │
├──────────────────────────────────┤
│  Performance Summary              │
│  Deliveries This Week  12 / 60    │
│  ████████░░░░░░░░░░░░░░          │  ← Progress bars
│  Earnings Target    $320 / $800   │
│  ██████░░░░░░░░░░░░░░░░░░        │
└──────────────────────────────────┘
```

#### Data Sources
| Data | Source | Realtime |
|------|--------|----------|
| Driver record | `drivers` table | No |
| Active deliveries count | `delivery_orders` count query | Yes (assigned channel) |
| Completed today count | `delivery_orders` count query | No |
| Total earnings | `delivery_orders` sum query | No |
| Weekly deliveries/earnings | `delivery_orders` aggregate | No |
| Unread notifications | `notifications` count query | No |
| Available orders | `delivery_orders` (pending) | Yes (INSERT/UPDATE) |
| Online status | Local state | Updates `drivers.availability` |

#### User Interactions
| Element | Action | Effect |
|---------|--------|--------|
| Online Switch | Toggle | Updates `drivers.availability`, optimistically toggles UI |
| Bell icon | Press | Navigates to `/(app)/(notifications)` |
| Order card | Press | Navigates to `/(app)/(driver)/[orderId]` |
| View button | Press | Navigates to `/(app)/(driver)/[orderId]` |
| Quick Actions | Press | Navigate to respective screens |
| Refresh | Pull (future) | Refetch all data |

#### Existing ✅
- Stats grid with 4 metrics
- Online/offline toggle with Switch
- Available orders horizontal carousel
- Quick actions row
- Performance summary with progress bars
- Realtime INSERTS/UPDATE for available orders
- useFocusEffect for refetch on screen focus

#### Missing ❌
- Pull-to-refresh
- Notification badge on bell icon (only count displayed, not the icon's indicator)
- Rewards screen (button is a no-op)
- Animated transitions for stats
- Skeleton loading state

---

### 3.2 Orders Screen (orders.tsx)

**Path:** `mobile/app/(app)/(driver)/orders.tsx`  
**Status:** ✅ Built

#### Layout
```
┌──────────────────────────────────┐
│  ← Available Orders       ↻     │  ← Header
├──────────────────────────────────┤
│  [Available]    [My Orders 3]    │  ← Tab bar
├──────────────────────────────────┤
│  [Distance ▾] [Price ▾] [Reward] │  ← Filter chips
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ DLV-ORD-001    15.00 YER   │  │
│  │ ● Store Name – Address     │  │  ← Order card
│  │ 📍 Drop-off Address        │  │
│  │ 2026-07-12    pending      │  │
│  │ ───────────────────────── │  │
│  │ 2.3 km – 12 min           │  │
│  │            [Details][Accept]│  │
│  └────────────────────────────┘  │
│  ...more cards...                │
├──────────────────────────────────┤
│  Orders are auto-refreshed       │  ← Note
└──────────────────────────────────┘
```

#### My Orders Tab
```
┌──────────────────────────────────┐
│  ┌────────────────────────────┐  │
│  │ DLV-ORD-001    [On The Way]│  │
│  │ 🏪 Pickup Address          │  │
│  │ 📍 Drop-off Address        │  │
│  │ Fee: 15.00 YER             │  │
│  └────────────────────────────┘  │
│  (active orders with status      │
│   badges, tappable for detail)   │
└──────────────────────────────────┘
```

#### Data Sources
| Tab | Source | Realtime |
|-----|--------|----------|
| Available | `delivery_orders` (pending) | Yes (INSERT/UPDATE) |
| My Orders | `useDriverOrders` hook | Yes (all events on assigned orders) |

#### User Interactions
| Element | Action | Effect |
|---------|--------|--------|
| Tab toggle | Press | Switch between Available/My Orders |
| Filter chips | Press | Sort available orders |
| Details button | Press | Navigate to order detail |
| Accept button | Press | Navigate to confirm-acceptance |
| Active order card | Press | Navigate to order detail |
| Pull-to-refresh | Pull (My Orders tab) | Calls refreshDriverOrders |
| Refresh header | Press | Refetches current tab data |

#### Existing ✅
- Dual-tab layout (Available / My Orders)
- 4 sort filters (Distance, Price, Reward, Area)
- Store name display per order
- Accept/Details buttons
- Active order status badge with colors
- useFocusEffect for refetch
- Pull-to-refresh on My Orders tab

#### Missing ❌
- Area filter (no implementation for area-based sorting)
- Map view toggle for available orders
- Search/filter by text
- Empty state illustration (uses text-only)
- Pagination for large order lists

---

### 3.3 Order Detail ([orderId].tsx)

**Path:** `mobile/app/(app)/(driver)/[orderId].tsx`  
**Status:** ✅ Built

#### Layout
```
┌──────────────────────────────────┐
│  Order Details                   │  ← Header
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Order ID    DLV-ORD-001    │  │
│  │ Status      [On The Way]   │  │  ← Info card
│  │ Created     Today, 2:30 PM │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Route                      │  │
│  │ 🏪 PICKUP                  │  │
│  │ Store Name         [Map]   │  │  ← Route card
│  │ Address                    │  │
│  │ 📍 DROP-OFF                │  │
│  │ Delivery Address           │  │
│  │ ───────────────────────── │  │
│  │ 📍 2.3 km    ⏱ 12 min    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Customer Details           │  │
│  │ Ahmed Mohammed      📞    │  │
│  │ +967 700 000 000          │  │  ← Customer card
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Payment Details            │  │
│  │ Delivery Fee     1,500 YER │  │
│  │ Reward Bonus       500 YER │  │  ← Payment card
│  │ ───────────────────────── │  │
│  │ Total Earnings   2,000 YER │  │
│  │ [💰 Cash on Delivery]     │  │
│  └────────────────────────────┘  │
│                                  │
│  [   Contextual Action Button  ] │  ← Status-dependent
│  [   Cancel Assignment        ]  │  ← If driver_accepted
└──────────────────────────────────┘
```

#### Status-Dependent Action Buttons

| Current Status | Next Status | Button Label | Screen |
|----------------|------------|-------------|--------|
| `pending` (no driver) | — | Accept Order | confirm-acceptance |
| `driver_accepted` | `driver_arrived_store` | Mark as Arrived at Store | inline update |
| `driver_arrived_store` | `picked_up` | Confirm Pickup | pickup-confirmation |
| `picked_up` | `on_the_way` | Start Delivery | en-route |
| `on_the_way` | `driver_arrived_destination` | Start Delivery | en-route |
| `driver_arrived_destination` | `delivered` | Complete Delivery | confirm-delivery |
| `delivered` | — | View Delivery Summary | delivery-summary |

#### Data Sources
- `delivery_orders` (direct query + Realtime UPDATE)
- `stores` (single query)
- `drivers` (single query)
- `order_assignments` (single query)

#### Real-time
- Channel `order-${orderId}`: UPDATE on `delivery_orders` (filter by id)
- `useDriverLocation` conditionally enabled for active statuses

#### Existing ✅
- Full order info display
- Store, customer, payment cards
- Status-based contextual buttons
- Distance/ETA calculation
- Map link (Google Maps directions to pickup)
- Call customer button
- Cancel Assignment (revert to pending)
- useFocusEffect for refetch
- mountedRef guard

#### Missing ❌
- Live map view (embedded map, not just external link)
- Chat quick-link to conversation
- Driver location marker on embedded map
- Order timeline visualization
- Status change animation

---

### 3.4 Confirm Acceptance (confirm-acceptance.tsx)

**Path:** `mobile/app/(app)/(driver)/confirm-acceptance.tsx`  
**Status:** ✅ Built

#### Layout
```
┌──────────────────────────────────┐
│  Confirm Acceptance              │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Order Summary              │  │
│  │ Order ID   DLV-ORD-001     │  │
│  │ Pickup     Store Name      │  │
│  │            Address         │  │
│  │ Drop-off   Address         │  │
│  │ 📍 2.3 km from you        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Payment Summary            │  │
│  │ Delivery Fee    1,500 YER  │  │
│  │ Reward            500 YER  │  │
│  │ ───────────────────────── │  │
│  │ Estimated Total 2,000 YER │  │
│  └────────────────────────────┘  │
│                                  │
│  ☐ I am available to complete   │  ← Checkbox
│    this delivery                 │
│                                  │
├──────────────────────────────────┤
│  [Confirm & Accept Order]        │  ← Green button
│  [Cancel]                        │
└──────────────────────────────────┘
```

#### Flow
1. Load order + store + driver data
2. If order.status !== 'pending', redirect to [orderId]
3. User checks confirmation checkbox
4. User presses "Confirm & Accept Order"
5. Calls `accept_order` RPC (SECURITY DEFINER, FOR UPDATE lock)
6. On success → `router.replace(/(app)/(driver)/${orderId})`
7. On failure → Alert with error message

#### Data Sources
- `delivery_orders` (single query — status check)
- `stores` (single query)
- `drivers` (single query)

#### RPCs Used
- `accept_order(p_order_id, p_driver_id)` → JSONB

#### Existing ✅
- Order summary with pickup/dropoff
- Payment summary with fee + reward
- Checkbox confirmation
- Status guard (redirects if not pending)
- Error handling for all failure modes
- Loading and accepting states

#### Missing ❌
- Estimated distance and time display
- SafeAreaView consistent padding with design
- Store logo display

---

### 3.5 Pickup Confirmation (pickup-confirmation.tsx)

**Path:** `mobile/app/(app)/(driver)/pickup-confirmation.tsx`  
**Status:** ✅ Built (recently updated with expo-image-picker)

#### Layout
```
┌──────────────────────────────────┐
│  Pickup Confirmation             │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Order ID    DLV-ORD-001    │  │
│  │ Status      [At Store]     │  │
│  │ Store       Store Name     │  │
│  │             Address        │  │
│  │ 📍 0.5 km from you        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Pickup Proof               │  │
│  │ [📷 Take Photo]            │  │  ← Camera/Photo
│  │ [🖼 Upload from Gallery]   │  │
│  │ ─────────────────────────  │  │
│  │ -------                    │  │
│  │ -------                    │  │  ← Signature placeholder
│  │ Store Representative Sig   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Notes                      │  │
│  │ ┌──────────────────────┐   │  │
│  │ │ Add any notes...     │   │  │  ← TextInput
│  │ └──────────────────────┘   │  │
│  └────────────────────────────┘  │
│                                  │
│  ☐ I confirm I have collected   │  ← Checkbox
│    this order from the store     │
│                                  │
├──────────────────────────────────┤
│  [Mark as Picked Up]             │
│  [Cancel]                        │
└──────────────────────────────────┘
```

#### Flow
1. Load order + store + driver
2. Validate status is `driver_arrived_store`
3. User can take photo or upload from gallery
4. User can add notes
5. User checks confirmation checkbox
6. Press "Mark as Picked Up"
7. Conditional update: `delivery_orders.status = 'picked_up'` (optimistic lock on status)
8. Insert `order_status_history`
9. `router.replace` to [orderId]

#### Data Sources
- `delivery_orders` (single query + pre-flight status check)
- `stores` (single query)
- `drivers` (single query)

#### Camera/Gallery
- Uses `expo-image-picker` (installed)
- Camera permission request
- Media library permission request
- Photo preview with remove option
- Photo URI stored as `proof_image_url` in DB

#### Existing ✅
- Camera and gallery integration with expo-image-picker
- Photo preview and removal
- Notes text input
- Confirmation checkbox
- Pre-flight status validation
- Optimistic locking via `.eq('status', 'driver_arrived_store')`
- order_status_history insert
- Loading and saving states

#### Missing ❌
- Signature capture (placeholder — needs `react-native-signature-canvas`)
- Upload photo to Supabase Storage (currently stores local URI as text)
- Photo compression before storage
- Map showing driver location relative to store

---

### 3.6 En Route (en-route.tsx)

**Path:** `mobile/app/(app)/(driver)/en-route.tsx`  
**Status:** ✅ Built (recently fixed for picked_up auto-transition)

#### Layout
```
┌──────────────────────────────────┐
│  Active Delivery                 │  ← Header
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │         [MAP]              │  │  ← MapView
│  │  Blue pin (You)            │  │
│  │  Green pin (Store)         │  │
│  │  Red pin (Customer)        │  │
│  │  ─── Polyline route ───    │  │
│  │  ┌──────────────────────┐  │  │
│  │  │ 📍 2.3 km · 12 min   │  │  │  ← ETA overlay
│  │  └──────────────────────┘  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ● ● ● ● ●                 │  │  ← Timeline (5 steps)
│  │ Accep AtSt Pick OnW  Arrv  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ DLV-ORD-001   [On The Way] │  │
│  │ 🏪 PICKUP                  │  │
│  │ Store Name                 │  │
│  │ Address                    │  │
│  │ 📍 DROP-OFF                │  │
│  │ Delivery Address           │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Customer                   │  │
│  │ Ahmed Mohammed      📞    │  │  ← Call button
│  │ +967 700 000 000          │  │
│  └────────────────────────────┘  │
│                                  │
│  [     Mark as Arrived        ]  │
│                                  │
├──────────────────────────────────┤
│  [🗺 Start Navigation] [📞 Call] │  ← Bottom bar
└──────────────────────────────────┘
```

#### Flow
1. Load order, if `picked_up` → auto-transition to `on_the_way`
2. Load store + driver
3. Validate status is `on_the_way` (or `picked_up` before auto-transition)
4. Subscribe to order updates + driver location updates
5. Show map with markers, timeline, customer info
6. User can press "Mark as Arrived" → calls `arriveAtDestination` RPC
7. On success → navigate to confirm-delivery

#### Data Sources
- `delivery_orders` (single query + Realtime UPDATE)
- `stores` (single query)
- `drivers` (single query + Realtime UPDATE for live location)

#### Real-time
- `en-route-order-${orderId}`: UPDATE on delivery_orders
- `en-route-driver-${d.id}`: UPDATE on drivers (live lat/lng)

#### Auto-Transition
- If status is `picked_up` on load, automatically transitions to `on_the_way`
- Inserts `order_status_history`
- Driver never sees the picked_up state on this screen

#### Existing ✅
- MapView with driver/store/customer markers
- Polyline route from store to customer
- ETA overlay with distance and time
- 5-step timeline (Accepted → At Store → Picked Up → On The Way → Arrived)
- Auto-transition picked_up → on_the_way
- Live driver location updates from Realtime
- Start Navigation (Google Maps deep link)
- Call Customer
- Mark as Arrived with RPC
- Location tracking via useDriverLocation

#### Missing ❌
- Driver marker does not move on map (needs region animation)
- No store-to-driver polyline (only store-to-customer)
- No estimated time of arrival at each step
- No bottom sheet with delivery instructions
- Map does not follow driver location automatically
- No "Arrived at Store" quick action (user must go back to detail screen)

---

### 3.7 Confirm Delivery (confirm-delivery.tsx)

**Path:** `mobile/app/(app)/(driver)/confirm-delivery.tsx`  
**Status:** ✅ Built

#### Layout
```
┌──────────────────────────────────┐
│  Confirm Delivery                │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ DLV-ORD-001                │  │
│  │ 🏪 PICKUP                  │  │
│  │ Store Name                 │  │
│  │ 📍 DROP-OFF                │  │
│  │ Address                    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Payment Summary            │  │
│  │ Delivery Fee    1,500 YER  │  │
│  │ Reward            500 YER  │  │
│  │ ───────────────────────── │  │
│  │ Total Earnings  2,000 YER │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Verification               │  │
│  │                            │  │
│  │ [IF OTP]                   │  │
│  │ Enter OTP                  │  │
│  │ ┌──────────────────────┐  │  │
│  │ │      000000          │  │  │
│  │ └──────────────────────┘  │  │
│  │                            │  │
│  │ [IF NO OTP]                │  │
│  │ [📷 Take Delivery Photo]   │  │
│  │ OR                          │  │
│  │ [✍️ Customer Signature]     │  │
│  └────────────────────────────┘  │
│                                  │
│  [   Complete Delivery         ] │
│  [⚠️ Report a Problem          ] │
└──────────────────────────────────┘
```

#### Flow
1. Load driver + order
2. Validate status is `driver_arrived_destination`
3. Show verification method based on order config
4. User completes verification (OTP or photo)
5. Press "Complete Delivery"
6. Calls `completeDelivery` RPC
7. RPC transitions to `delivered`, increments driver stats
8. Realtime subscription detects `delivered` → auto-redirect to delivery-summary

#### Data Sources
- `drivers` (single query)
- `delivery_orders` (single query + Realtime UPDATE)
- `stores` (single query)

#### RPCs Used
- `completeDelivery(orderId, driverId, verificationMethod, verificationData)` → DeliveryResult

#### Verification Methods
| Method | Condition | Data |
|--------|-----------|------|
| OTP | `order.otp_code` is set | 6-digit code match |
| Photo | No OTP, no signature URL | Image URI |
| Signature | `order.proof_signature_url` set | Already captured |
| None | No OTP, no signature, no photo | Empty |

#### Existing ✅
- OTP input with 6-digit styling
- Photo capture via expo-image-picker
- Delivery summary auto-navigation on delivered
- Error handling for failed RPC
- Access guards (status, assignment)
- Loading and completing states
- Payment summary

#### Missing ❌
- Signature capture (only shows placeholder text when signature_url exists)
- Photo upload to Supabase Storage
- Multiple verification methods combined
- Retry logic on RPC failure

---

### 3.8 Delivery Summary (delivery-summary.tsx)

**Path:** `mobile/app/(app)/(driver)/delivery-summary.tsx`  
**Status:** ✅ Built

#### Layout
```
┌──────────────────────────────────┐
│  Delivery Complete ✓             │  ← Success banner
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ DLV-ORD-001                │  │
│  │ 🏪 PICKUP                  │  │
│  │ Store Name                 │  │
│  │ 📍 DROP-OFF                │  │
│  │ Address                    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Customer                   │  │
│  │ Ahmed Mohammed             │  │
│  │ +967 700 000 000           │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Earnings Breakdown         │  │
│  │ Delivery Fee    1,500 YER  │  │
│  │ Commission       -200 YER  │  │
│  │ Reward Bonus      500 YER  │  │
│  │ ───────────────────────── │  │
│  │ Total          1,800 YER   │  │
│  │ [💰 Cash on Delivery]     │  │
│  └────────────────────────────┘  │
│                                  │
│  [    Back to Dashboard        ] │
└──────────────────────────────────┘
```

#### Flow
1. Load driver + order
2. Validate status is `delivered` and driver is assigned
3. Display summary info
4. Press "Back to Dashboard" → `router.replace('/(app)/(driver)')`

#### Existing ✅
- Order info display
- Customer info
- Earnings breakdown
- Payment method badge
- Access guard and validation
- Loading state

#### Missing ❌
- Delivery time and distance metrics
- Customer rating prompt (future)
- Share delivery confirmation
- Map screenshot of route
- Order completion animation

---

### 3.9 Report Issue (report-issue.tsx)

**Path:** `mobile/app/(app)/(driver)/report-issue.tsx`  
**Status:** ✅ Built

#### Layout
```
┌──────────────────────────────────┐
│  Report a Problem                │
├──────────────────────────────────┤
│  What's the issue?               │
│                                  │
│  ○ Customer Unavailable          │  ← Radio buttons
│  ○ Wrong Address                 │
│  ○ Customer Refused              │
│  ○ Store Issue                   │
│  ○ Vehicle Issue                 │
│  ○ Emergency                     │
│  ○ Other                         │
│                                  │
│  Description (optional)          │
│  ┌────────────────────────────┐  │
│  │                           │  │  ← TextInput
│  │                           │  │
│  └────────────────────────────┘  │
│                                  │
├──────────────────────────────────┤
│  [   Submit Report             ] │
│  [Cancel, Return to Delivery   ] │
└──────────────────────────────────┘
```

#### Issue Types
| Key | Label |
|-----|-------|
| `customer_unavailable` | Customer Unavailable |
| `wrong_address` | Wrong Address |
| `customer_refused` | Customer Refused |
| `store_issue` | Store Issue |
| `vehicle_issue` | Vehicle Issue |
| `emergency` | Emergency |
| `other` | Other |

#### Flow
1. Validate order + driver access
2. User selects issue type
3. User optionally writes description
4. User presses "Submit Report"
5. Calls `reportDeliveryIssue` RPC
6. On success → Alert then navigate back
7. On failure → Alert with error

#### Existing ✅
- 7 issue type radio buttons
- Optional description input
- RPC call with error handling
- Access validation
- Loading and submitting states

#### Missing ❌
- Photo attachment for the issue
- Issue status tracking after submission
- Contact support option

---

### 3.10 Wallet (wallet.tsx)

**Path:** `mobile/app/(app)/(driver)/wallet.tsx`  
**Status:** ⚠️ Basic (needs expansion)

#### Current Layout
```
┌──────────────────────────────────┐
│           👛                     │
│          $0.00                   │  ← Just the balance
│     Wallet Balance               │
└──────────────────────────────────┘
```

#### Missing (Complete Wallet Screen) ❌
- **Balance display** with show/hide toggle
- **Transaction history** list with pagination
- **Transaction types** (deposit, withdrawal, order_payment, commission, refund, payout)
- **Pending payouts** section
- **Payout method management** (bank account from drivers table)
- **Earnings this week / this month** summary
- **Withdrawal request** flow
- **Transaction filter** by type and date
- **Pull-to-refresh** for latest balance

---

### 3.11 Profile (profile.tsx)

**Path:** `mobile/app/(app)/(driver)/profile.tsx`  
**Status:** ⚠️ Basic (shared component, needs driver-specific expansion)

#### Current Component
- Avatar display
- Full name and role
- Phone number
- Sign out button

#### Missing ❌
- **Vehicle info** (type, plate, color) with edit
- **Documents status** (license, vehicle registration, ID)
- **Bank account** (name, bank, account number) with edit
- **Rating** display with breakdown
- **Total deliveries** counter
- **Member since** date
- **Settings** link
- **Language** selection
- **Theme** toggle (future)

---

### 3.12 Conversations (conversations.tsx)

**Path:** `mobile/app/(app)/(driver)/conversations.tsx`  
**Status:** ⚠️ Basic (shared component)

#### Current Component
- FlatList of conversations
- Links to `/(app)/(chat)/[orderId]`

#### Missing ❌
- Unread message badge per conversation
- Last message preview
- Timestamp display
- Sender name/role display
- Pull-to-refresh
- Empty state illustration

---

## 4. Order Status Machine

### 4.1 Status Flow

```
┌──────────┐
│  pending  │  ← Initial state when store creates order
└────┬─────┘
     │ driver accepts (accept_order RPC)
     ▼
┌──────────────────┐
│ driver_accepted   │  ← Trigger sync_assigned_driver()
└──────┬───────────┘
       │ driver arrives at store
       ▼
┌─────────────────────┐
│ driver_arrived_store │  ← Direct update
└──────┬──────────────┘
       │ driver confirms pickup
       ▼
┌───────────┐
│ picked_up  │  ← Direct update + order_status_history
└─────┬─────┘
      │ auto-transition (en-route.tsx)
      ▼
┌─────────────┐
│ on_the_way   │  ← Direct update + order_status_history
└──────┬──────┘
       │ arriveAtDestination RPC
       ▼
┌──────────────────────────┐
│ driver_arrived_destination│  ← RPC with FOR UPDATE lock
└────────┬─────────────────┘
         │ completeDelivery RPC
         ▼
┌────────────┐
│  delivered  │  ← RPC with OTP/photo/signature verification
└────────────┘

ANY state ──→ cancelled (via cancel_reason + cancelled_by)
```

### 4.2 Status Constraints

| From | To | Method | Lock |
|------|----|--------|------|
| `pending` | `driver_accepted` | `accept_order` RPC | FOR UPDATE |
| `driver_accepted` | `driver_arrived_store` | `delivery_orders.update` | Optimistic (none) |
| `driver_arrived_store` | `picked_up` | `delivery_orders.update` | `.eq('status', 'driver_arrived_store')` |
| `picked_up` | `on_the_way` | `delivery_orders.update` | `.eq('status', 'picked_up')` |
| `on_the_way` | `driver_arrived_destination` | `arriveAtDestination` RPC | FOR UPDATE |
| `driver_arrived_destination` | `delivered` | `completeDelivery` RPC | FOR UPDATE |
| Any | `cancelled` | `delivery_orders.update` | Direct |

### 4.3 Timestamp Columns

| Status | Timestamp Column |
|--------|-----------------|
| `driver_accepted` | `driver_accepted_at` |
| `driver_arrived_store` | `driver_arrived_store_at` |
| `picked_up` | `picked_up_at` |
| `on_the_way` | `on_the_way_at` |
| `driver_arrived_destination` | `driver_arrived_destination_at` |
| `delivered` | `delivered_at` |
| `cancelled` | `cancelled_at` |

---

## 5. Design System

### 5.1 Theme

**The driver module uses a dedicated dark theme** distinct from the shared light theme used by auth/setup screens.

#### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `screenBg` | `#0E1212` | Operational screen backgrounds |
| `screenBg2` | `#121212` | Home/Orders/Wallet backgrounds |
| `cardBg` | `#1A1D28` | Operational screen cards |
| `cardBg2` | `#1E1E1E` | Home/Orders cards |
| `white` | `#FFFFFF` | Primary text |
| `nearWhite` | `#F3F4F6` | Secondary values |
| `label` | `#6B7280` | Labels, secondary text |
| `textGray` | `#9CA3AF` | Secondary text (Home) |
| `textDim` | `#6B6B6B` | Dim text (Orders) |
| `green` | `#22C55E` | Primary accent |
| `greenDark` | `#064E3B` | Button backgrounds |
| `greenLight` | `#4ADE80` | Button text, completed |
| `redDark` | `#7F1D1D` | Drop-off pin, cancelled |
| `redBadge` | `#EF4444` | Notification badge |
| `border` | `#2A2D3A` | Card borders |
| `divider` | `#2A2D3A` | Dividers |
| `badgeGray` | `#2A2D3A` | Secondary button bg |
| `disabledBg` | `#2A2D3A` | Disabled bg |
| `disabledText` | `#6B7280` | Disabled text |

#### Typography
- System font (no custom fonts)
- Weights: 700 (bold headings), 600 (semibold), 500 (medium)
- Sizes: 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 48

#### Spacing Scale
- 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 80, 120

#### Border Radius
| Value | Usage |
|-------|-------|
| `6` | Badges, checkboxes |
| `8` | ETA overlay, button accessories |
| `10` | Filter chips, inputs, proof buttons |
| `12` | Cards, primary buttons |
| `14` | Drop pin |
| `16` | Home screen cards, stats |
| `20` | Filter chips (pill) |
| `24` | Call buttons, avatar |
| `9999` | Pills |

### 5.2 Component Library (Target)

| Component | Status | Description |
|-----------|--------|-------------|
| Card | ✅ Inline | Reusable card with consistent styling |
| Primary Button | ✅ Inline | Green dark bg, green light text |
| Secondary Button | ✅ Inline | Gray bg, gray text |
| Ghost Button | ✅ Inline | No bg, label-colored text |
| Badge | ✅ Inline | Status badge with bg + text color |
| Input (Text) | ⚠️ Varies | Different styles per screen |
| Input (OTP) | ✅ Inline | Centered, large, letter-spaced |
| Checkbox | ✅ Inline | Custom checkbox with checkmark |
| Radio Button | ✅ Inline | Custom radio with dot |
| Timeline | ✅ Inline | 5-step dot/line progress |
| Map | ✅ Inline | react-native-maps with markers |
| Bottom Bar | ✅ Inline | Absolute-positioned action bar |
| Tabs | ✅ Inline | Available/My Orders tabs |
| Filter Chip | ✅ Inline | Sort filter pills |

### 5.3 Consistency Issues to Fix

1. **Two different dark backgrounds**: `#121212` (Home) vs `#0E1212` (operational) → Unify
2. **Two different card backgrounds**: `#1E1E1E` (Home) vs `#1A1D28` (operational) → Unify
3. **Two different border colors**: `#2A2A2A` (Home) vs `#2A2D3A` (operational) → Unify
4. **Multiple radius values**: 10, 12, 16 all used for similar cards → Standardize
5. **No shared dark theme file**: Colors duplicated across 13+ files → Extract to theme dir
6. **Tab bar styled in `_layout.tsx`**: Hardcoded values → Theme constants
7. **Status badge colors duplicated**: In `[orderId].tsx` and `orders.tsx` → Shared mapping

---

## 6. Hooks & Services

### 6.1 Custom Hooks

| Hook | Status | Used By | Purpose |
|------|--------|---------|---------|
| `useDriverOrders` | ✅ | orders.tsx | Active/completed/cancelled orders |
| `useDriverLocation` | ✅ | [orderId].tsx, en-route.tsx | GPS tracking per order |
| `useConversations` | ✅ | conversations.tsx | Chat list |
| `useChat` | ✅ | Chat screen | Per-order messaging |
| `useNotificationsList` | ✅ | Notifications | Notification list + mark read |
| `useOrderGuard` | ⚠️ | Not used by any screen | Reusable route guard |
| `useAuthGuard` | ✅ | Root layout | Auth-based routing |
| `usePushToken` | ✅ | Root layout | Push notification registration |

### 6.2 Services

| Service | Status | Purpose |
|---------|--------|---------|
| `delivery-service.ts` | ✅ | Wraps 3 RPCs: arriveAtDestination, completeDelivery, reportDeliveryIssue |

### 6.3 Stores

| Store | Status | Purpose |
|-------|--------|---------|
| `auth-store.ts` | ✅ | Auth state, session, profile, setup check |

---

## 7. Database Tables Used

| Table | Usage | Screens |
|-------|-------|---------|
| `profiles` | Driver identity, avatar | All screens (via auth-store) |
| `drivers` | Vehicle, rating, availability, location, bank | Home, Profile, Order Detail |
| `delivery_orders` | All order data, status, timestamps | ALL operational screens |
| `stores` | Store name, logo, location | Order detail, en-route, etc. |
| `order_assignments` | Assignment record | Confirm acceptance, Order detail |
| `order_status_history` | Audit log | En-route (auto-transition insert), Pickup confirmation |
| `driver_documents` | Verification docs | Profile (future) |
| `driver_locations` | GPS tracking points | via useDriverLocation hook |
| `wallets` | Balance | Wallet screen |
| `wallet_transactions` | Transaction history | Wallet (future) |
| `conversations` | Chat conversations | Conversations |
| `conversation_participants` | Chat members | Conversations |
| `messages` | Chat messages | Chat screen |
| `notifications` | In-app notifications | Notifications, Home badge |
| `delivery_issues` | Issue reports | Report issue |

---

## 8. RPCs Used

| RPC | Parameters | Returns | Called From |
|-----|-----------|---------|-------------|
| `accept_order` | p_order_id, p_driver_id | JSONB | confirm-acceptance |
| `arrive_at_destination` | p_order_id, p_driver_id | JSONB | en-route → delivery-service |
| `complete_delivery` | p_order_id, p_driver_id, p_verification_method, p_verification_data | JSONB | confirm-delivery → delivery-service |
| `report_delivery_issue` | p_order_id, p_driver_id, p_issue_type, p_description | JSONB | report-issue → delivery-service |
| `ensure_conversation` | p_order_id, p_profile_id, p_participant_role | UUID | Chat hook |

---

## 9. Realtime Subscriptions

| Channel Name | Table | Event | Filter | Screens |
|-------------|-------|-------|--------|---------|
| `driver-home-orders` | delivery_orders | INSERT | status=eq.pending | Home |
| `driver-home-orders` | delivery_orders | UPDATE | none | Home |
| `driver-home-orders` | delivery_orders | * | assigned_driver_id=eq.{id} | Home |
| `orders-available` | delivery_orders | INSERT | status=eq.pending | Orders |
| `orders-available` | delivery_orders | UPDATE | none | Orders |
| `order-${orderId}` | delivery_orders | UPDATE | id=eq.{orderId} | [orderId] |
| `en-route-order-${orderId}` | delivery_orders | UPDATE | id=eq.{orderId} | en-route |
| `en-route-driver-${d.id}` | drivers | UPDATE | id=eq.{id} | en-route |
| `confirm-delivery-${orderId}` | delivery_orders | UPDATE | id=eq.{orderId} | confirm-delivery |
| `driver-my-orders-${driver.id}` | delivery_orders | * | assigned_driver_id=eq.{id} | useDriverOrders hook |

---

## 10. Notifications

### 10.1 Driver Notification Types

| Type | Trigger | Title (AR) | Title (EN) |
|------|---------|-----------|-----------|
| `order_update` | New order assigned | تم تعيينك لتوصيل طلب | New delivery assigned |
| `order_update` | Order status changes | حالة الطلب: ... | Order status: ... |
| `new_message` | New chat message | رسالة جديدة | New message |

### 10.2 Notification Handling
- **In-app:** `notifications` table with realtime subscription
- **Push:** `push_tokens` table via `usePushToken` hook
- **Deep linking:** Notification `data.order_id` used to navigate to order detail

### 10.3 Current State
- Notifications list screen exists (`(app)/(notifications)/index.tsx`)
- Home screen shows unread count
- Bell icon navigates to notifications
- No badge on notifications tab icon

---

## 11. Permissions

| Permission | Status | Used By |
|-----------|--------|---------|
| Location (foreground) | ✅ Configured | `useDriverLocation` hook |
| Location (always) | ✅ Configured | Required for background tracking |
| Camera | ✅ Added (app.json) | `pickup-confirmation.tsx`, `confirm-delivery.tsx` |
| Photo Library | ✅ Added (app.json) | `pickup-confirmation.tsx` |
| Notifications | ✅ Configured | `usePushToken` hook |

---

## 12. States: Loading, Empty, Error, Offline

### 12.1 Current Implementation

| Screen | Loading | Empty | Error | Offline |
|--------|---------|-------|-------|---------|
| Home | ✅ Full-screen spinner | ✅ "No orders available" | ❌ Silent failure | ❌ Not handled |
| Orders | ✅ Full-screen spinner | ✅ Both tabs have empty states | ❌ Silent failure | ❌ Not handled |
| [orderId] | ✅ Full-screen spinner | ✅ "Order not found" | ❌ No network error | ❌ Not handled |
| confirm-acceptance | ✅ Full-screen spinner | ✅ "Order not found" | ✅ Alert on RPC failure | ❌ Not handled |
| pickup-confirmation | ✅ Full-screen spinner | ✅ "Order not found" | ✅ Alerts for various failures | ❌ Not handled |
| en-route | ✅ Full-screen spinner | ✅ "Order not found" | ✅ Access errors with back button | ❌ Not handled |
| confirm-delivery | ✅ Full-screen spinner | ✅ "Order not found" | ✅ Access errors, RPC alerts | ❌ Not handled |
| delivery-summary | ✅ Full-screen spinner | ✅ "Order not found" | ✅ Access errors | ❌ Not handled |
| report-issue | ✅ Full-screen spinner | ❌ (shows access error) | ✅ Access errors, RPC alerts | ❌ Not handled |
| Wallet | ✅ Full-screen spinner | ❌ Shows $0.00 | ❌ Silent failure | ❌ Not handled |

### 12.2 Gap Analysis

| State | Status | Action Needed |
|-------|--------|--------------|
| **Loading** | ✅ All screens covered | Consider skeleton loaders for Home |
| **Empty** | ⚠️ Most screens covered | Wallet needs proper empty state |
| **Error** | ❌ Network errors not caught | Add try/catch to all fetches |
| **Offline** | ❌ Not handled anywhere | Add NetInfo + offline banner |
| **Retry** | ❌ No retry mechanism | Add retry buttons on error states |

---

## 13. Existing vs Missing — Complete Inventory

### 13.1 What Exists ✅

| # | Feature | Screen | Status |
|---|---------|--------|--------|
| 1 | Driver Dashboard | Home | ✅ |
| 2 | Online/Offline Toggle | Home | ✅ |
| 3 | Stats Grid (4 metrics) | Home | ✅ |
| 4 | Available Orders Carousel | Home | ✅ |
| 5 | Performance Summary | Home | ✅ |
| 6 | Quick Actions | Home | ✅ |
| 7 | Available Orders List | Orders | ✅ |
| 8 | Sort Filters (3 of 4) | Orders | ✅ |
| 9 | My Orders Tab | Orders | ✅ |
| 10 | Order Status Badges | Orders | ✅ |
| 11 | Order Detail | [orderId] | ✅ |
| 12 | Status Flow Buttons | [orderId] | ✅ |
| 13 | Distance/ETA | [orderId] | ✅ |
| 14 | Call Customer | [orderId] | ✅ |
| 15 | Map Directions Link | [orderId] | ✅ |
| 16 | Order Acceptance | confirm-acceptance | ✅ |
| 17 | Payment Preview | confirm-acceptance | ✅ |
| 18 | Pickup Photo (camera) | pickup-confirmation | ✅ |
| 19 | Pickup Photo (gallery) | pickup-confirmation | ✅ |
| 20 | Pickup Notes | pickup-confirmation | ✅ |
| 21 | Pickup Status Update | pickup-confirmation | ✅ |
| 22 | Live Map with Markers | en-route | ✅ |
| 23 | Timeline Progress | en-route | ✅ |
| 24 | ETA Overlay | en-route | ✅ |
| 25 | Auto-Transition picked_up | en-route | ✅ |
| 26 | Start Navigation | en-route | ✅ |
| 27 | Mark as Arrived | en-route | ✅ |
| 28 | OTP Verification | confirm-delivery | ✅ |
| 29 | Delivery Photo | confirm-delivery | ✅ |
| 30 | Complete Delivery RPC | confirm-delivery | ✅ |
| 31 | Earnings Summary | delivery-summary | ✅ |
| 32 | Issue Reporting | report-issue | ✅ |
| 33 | Wallet Balance | wallet | ✅ |
| 34 | Profile View | profile | ✅ |
| 35 | Conversations List | conversations | ✅ |
| 36 | Real-time Chat | Chat screen | ✅ |
| 37 | Push Notifications | Root (usePushToken) | ✅ |
| 38 | Notification List | Notifications | ✅ |
| 39 | Auth (Login/Register) | Auth | ✅ |
| 40 | Role-based Setup | Setup | ✅ |
| 41 | Realtime Order Updates | Multiple screens | ✅ |
| 42 | Driver Location Tracking | Multiple screens | ✅ |
| 43 | useFocusEffect | Home, Orders, [orderId] | ✅ |
| 44 | Realtime Available Orders | Home, Orders | ✅ (fixed) |

### 13.2 What Needs Improvement ⚠️

| # | Feature | Screen | Issue |
|---|---------|--------|-------|
| 1 | Wallet | wallet.tsx | Balance only, no transactions |
| 2 | Profile | profile.tsx | Generic, no driver-specific data |
| 3 | Conversations | conversations.tsx | No unread badges, no previews |
| 4 | Rewards | Quick Actions | No-op button |
| 5 | Map in en-route | en-route | Driver marker doesn't auto-follow |
| 6 | Signature Capture | pickup-confirmation | Placeholder only |
| 7 | Photo Storage | All | Local URI, not uploaded to Supabase Storage |
| 8 | Design Consistency | All | Two dark themes, duplicated colors |
| 9 | Error Handling | All | Silent failures on fetch |
| 10 | Offline Support | All | Missing entirely |

### 13.3 What's Missing ❌

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 1 | **Wallet Transactions** | High | Complete financial history |
| 2 | **Driver Profile Edit** | High | Vehicle, bank, documents |
| 3 | **Documents Upload** | High | License, vehicle reg, ID |
| 4 | **Account Status Screen** | High | Verification status, docs status |
| 5 | **Rewards / Incentives** | Medium | Gamification, bonus tracking |
| 6 | **Driver Ratings** | Medium | Rating breakdown + reviews |
| 7 | **Offline Banner** | Medium | NetInfo + banner + retry |
| 8 | **Skeleton Loading** | Medium | Replace spinners with skeletons |
| 9 | **Pull-to-Refresh (Home)** | Low | Manual refresh |
| 10 | **Area Sort Filter** | Low | 4th filter not implemented |
| 11 | **Search Orders** | Low | Text search |
| 12 | **Dark/Light Theme** | Low | Theme toggle |
| 13 | **Language (AR/EN)** | Low | Arabic support |
| 14 | **Order Reassignment** | Low | Request reassignment |
| 15 | **Extended Earnings** | Low | Charts, daily/weekly breakdown |
