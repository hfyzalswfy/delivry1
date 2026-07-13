# FullDelivery — Store Module Product Specification

> **Version:** 1.0  
> **Status:** Draft for Review  
> **Last Updated:** 2026-07-12  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Navigation Flow](#2-navigation-flow)
3. [Screen Specifications](#3-screen-specifications)
4. [Design System](#4-design-system)
5. [Database Tables Used](#5-database-tables-used)
6. [RPCs Used](#6-rpcs-used)
7. [Realtime Subscriptions](#7-realtime-subscriptions)
8. [States: Loading, Empty, Error](#8-states)
9. [Existing vs Missing](#9-existing-vs-missing)

---

## 1. Overview

The Store Module enables store owners and their staff to create and manage delivery orders, communicate with drivers, and track deliveries in real-time.

### Current State
- **5 screens built** (4 tab screens + 1 hidden)
- **Order management**: Create orders, view list, view details with live tracking
- **Chat**: Per-order conversations with drivers
- **Basic profile**: Shared profile component
- **Light theme** (shared with auth screens)

### Roles
- **Store Owner** — full access (creates orders, manages staff, views reports)
- **Store Staff** — limited access (can_create_orders, can_view_reports from `store_staff` table)

---

## 2. Navigation Flow

### 2.1 Tab Structure

```
Orders (index)    New Order (create-order)    Messages (conversations)    Profile (profile)
     |                   |                           |                         |
     ├─ Order List       ├─ Create Order Form        ├─ Shared Component       ├─ Shared Component
     ├─ Realtime Updates ├─ Map Picker               └─ (see Shared Specs)     └─ (see Shared Specs)
     ├─ Status Filters   ├─ Customer Info
     └─ Search           ├─ Shipment Type
                          └─ Fee Calculation
```

### 2.2 Hidden Routes

```
[orderId].tsx    ← Order detail with live tracking + chat link
```

### 2.3 Flow Diagram

```
[Orders List]
    │
    ├──► Tap Order ──► [Order Detail]
    │                       │
    │                  ├── Live Tracking Map
    │                  ├── Driver Info & Rating
    │                  ├── Customer Info
    │                  ├── Chat Link → [Chat Screen]
    │                  └── Status Timeline
    │
    └──► "New Order" ──► [Create Order]
                            │
                       ├── Pickup Location (Map)
                       ├── Delivery Location (Map)
                       ├── Customer Info (name, phone)
                       ├── Shipment Type & Description
                       ├── Delivery Fee & Payment Method
                       └── "Create Order" → back to list
```

---

## 3. Screen Specifications

### 3.1 Store Orders List (index.tsx)

**Path:** `mobile/app/(app)/(store)/index.tsx`  
**Status:** ✅ Built (basic)

#### Layout
```
┌──────────────────────────────────┐
│  Orders           🔔 🔒          │  ← Header with actions
├──────────────────────────────────┤
│  [All] [Active] [Delivered] [Can]│  ← Status filter tabs
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ DLV-ORD-001    [Pending]    │  │
│  │ 🏪 Store Name              │  │  ← Order card
│  │ 📍 Drop-off Address        │  │
│  │ 2026-07-12    1,500 YER    │  │
│  │ 📞 Customer Name           │  │
│  └────────────────────────────┘  │
│  ...more cards...                │
├──────────────────────────────────┤
│  [+]   ← FAB to create order    │
└──────────────────────────────────┘
```

#### Data Sources
| Data | Source | Realtime |
|------|--------|----------|
| Orders for store | `delivery_orders` by store_id | Yes (INSERT/UPDATE) |
| Store info | `stores` table | No |

#### User Interactions
| Element | Action | Effect |
|---------|--------|--------|
| Order card | Press | Navigate to `[orderId]` |
| Filter tabs | Press | Filter by status |
| FAB (+) | Press | Navigate to `create-order` |
| Notification bell | Press | Navigate to notifications |

#### Existing ✅
- Scrollable order list
- Basic order cards with status, address, fee
- Header with notifications and signout

#### Missing ❌
- **Status filter tabs** not implemented (current code uses FlatList without filtering UI)
- **Search** by order number or customer
- **Pull-to-refresh**
- **Empty state** illustration
- **Badge counts** per status filter
- **Pagination** for large lists
- **Skeleton loading**

---

### 3.2 Create Order (create-order.tsx)

**Path:** `mobile/app/(app)/(store)/create-order.tsx`  
**Status:** ✅ Built

#### Layout
```
┌──────────────────────────────────┐
│  Create Order                    │
├──────────────────────────────────┤
│  Customer Info                   │
│  ┌────────────────────────────┐  │
│  │ Full Name    [____________]│  │
│  │ Phone        [____________]│  │
│  └────────────────────────────┘  │
│                                  │
│  Pickup Location                 │
│  ┌────────────────────────────┐  │
│  │         [MAP]              │  │  ← Map with draggable pin
│  │ Address: [____________]    │  │
│  └────────────────────────────┘  │
│                                  │
│  Delivery Location               │
│  ┌────────────────────────────┐  │
│  │         [MAP]              │  │
│  │ Address: [____________]    │  │
│  │ Apt/Floor/Landmark        │  │
│  └────────────────────────────┘  │
│                                  │
│  Shipment Details                │
│  ┌────────────────────────────┐  │
│  │ Type: [Select ▾]           │  │
│  │ Description: [____________]│  │
│  │ Weight: [______] kg       │  │
│  └────────────────────────────┘  │
│                                  │
│  Pricing & Payment               │
│  ┌────────────────────────────┐  │
│  │ Delivery Fee: [_________]  │  │
│  │ Payment: ○ Cash ○ Card ○   │  │
│  │ Notes for Driver: [______] │  │
│  └────────────────────────────┘  │
│                                  │
├──────────────────────────────────┤
│  [   Create Order              ] │
└──────────────────────────────────┘
```

#### Flow
1. Fill customer info (name, phone)
2. Set pickup location via map or address text
3. Set delivery location via map or address text
4. Optionally set shipment type, description, weight
5. Set delivery fee, payment method, notes
6. Press "Create Order"
7. Creates `delivery_orders` record + triggers notifications to nearby drivers

#### Data Sources
| Data | Source |
|------|--------|
| Store location | `stores` table (default pickup) |
| Customer (lookup) | `ensure_customer_by_phone` RPC |
| Shipment types | `shipment_types` table |

#### RPCs Used
- `ensure_customer_by_phone(p_phone, p_name)` → UUID (find-or-create)

#### Existing ✅
- Map picker for pickup and delivery locations
- Customer name and phone inputs
- Shipment type dropdown
- Shipment description and weight
- Delivery fee input
- Payment method radio buttons
- Notes for driver
- Create order button

#### Missing ❌
- **Store name/address auto-fill** for pickup (uses map default)
- **Saved customer autocomplete** from history
- **Address search** (geocoding)
- **Estimated fee calculation** based on distance
- **OTP toggle** (for OTP-protected deliveries)
- **Priority toggle** (normal/express)
- **Duplicate order from existing** (reorder)
- **Form validation** (inline error messages)
- **Loading state** on submit

---

### 3.3 Store Order Detail ([orderId].tsx)

**Path:** `mobile/app/(app)/(store)/[orderId].tsx`  
**Status:** ✅ Built

#### Layout
```
┌──────────────────────────────────┐
│  Order Details                   │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Order #    DLV-ORD-001     │  │
│  │ Status     [On The Way]    │  │
│  │ Created    Today, 2:30 PM  │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Live Tracking              │  │
│  │         [MAP]              │  │  ← Driver location + route
│  │  Driver: Ahmed - ⭐4.8    │  │
│  │  📞 [Call Driver] 💬 [Chat]│  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Customer: Ahmed Mohammed   │  │
│  │ Phone: +967 700 000 000   │  │
│  │ Delivery: Address          │  │
│  │ Apt/Floor: ...            │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Timeline                   │  │
│  │ ✓ Created 2:30 PM          │  │
│  │ ✓ Accepted 2:35 PM         │  │  ← Status history
│  │ ✓ At Store 2:50 PM         │  │
│  │ ● Picked Up 3:00 PM       │  │
│  │ ○ On The Way              │  │
│  │ ○ Delivered               │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Payment                    │  │
│  │ Fee: 1,500 YER             │  │
│  │ Commission: 200 YER        │  │
│  │ Method: Cash              │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

#### Data Sources
| Data | Source | Realtime |
|------|--------|----------|
| Order | `delivery_orders` | Yes (UPDATE) |
| Driver | `drivers` (via assigned_driver_id) | Yes (location) |
| Customer | `delivery_orders` (denormalized) | No |
| Timeline | `order_status_history` | No |

#### Existing ✅
- Order info with status badge
- Live tracking map with driver marker
- Driver info card with name, rating, phone
- Call driver button
- Chat link to conversation
- Customer info
- Payment details
- order_status_history timeline display

#### Missing ❌
- **Cancel order** button
- **Edit order** (before driver accepts)
- **Resend notification** to nearby drivers
- **Delivery proof** view (photo/signature after delivery)
- **Recipient confirmation** (customer signature/photo)

---

### 3.4 New Order Flow Detail (create-order.tsx continued)

See section 3.2 above for full create order spec. The flow uses:
1. `ensure_customer_by_phone` RPC to find-or-create customer
2. Direct `delivery_orders.insert` with all order data
3. Trigger `trg_notify_new_order` sends notifications to nearby drivers

---

### 3.5 Store Dashboard (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Today's Stats** | Orders today, revenue, active deliveries | High |
| **Weekly Chart** | Order volume trend (7 days) | High |
| **Monthly Revenue** | Total revenue + commission | High |
| **Pending Orders** | Quick list of unassigned orders | High |
| **Driver Performance** | Avg delivery time, ratings | Medium |
| **Customer Count** | Unique customers this period | Medium |

---

### 3.6 Store Customers (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Customer List** | All customers who ordered from this store | High |
| **Search & Filter** | By name, phone, order count | High |
| **Order History** | Per-customer order history | High |
| **Customer Detail** | Name, phone, addresses, total orders, total spent | High |
| **Quick Order** | Create new order for existing customer | Medium |

---

### 3.7 Store Wallet / Financials (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Balance** | Current wallet balance | High |
| **Transactions** | Complete transaction history | High |
| **Pending Payouts** | Amount available for withdrawal | High |
| **Revenue Breakdown** | Delivery fees, platform commissions | High |
| **Payout Requests** | Request withdrawal | Medium |
| **Date Range Filter** | Filter transactions by date | Medium |

---

### 3.8 Store Analytics (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Orders Overview** | Daily/weekly/monthly order counts | High |
| **Revenue Chart** | Earnings trend with average | High |
| **Peak Hours** | Busiest delivery times | Medium |
| **Top Customers** | Most frequent customers | Medium |
| **Driver Performance** | Fastest/most reliable drivers | Medium |
| **Cancellation Rate** | % of orders cancelled | Low |

---

### 3.9 Store Employees (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Staff List** | All store_staff records | High |
| **Add Staff** | Invite by email/phone | High |
| **Permissions** | Toggle can_create_orders, can_view_reports | High |
| **Remove Staff** | Deactivate or delete | High |

---

### 3.10 Store Branches (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Branch List** | Multiple store locations | Medium |
| **Add Branch** | New location with address/map | Medium |
| **Branch Switch** | Toggle between branches in orders list | Medium |
| **Per-Branch Stats** | Orders and revenue per branch | Low |

---

### 3.11 Store Settings (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Store Profile** | Name, logo, phone, email, address | High |
| **Business Hours** | Operating hours configuration | Medium |
| **Notification Preferences** | Which events trigger notifications | Medium |
| **Default Settings** | Default fee, default pickup location | Low |

---

## 4. Design System

### 4.1 Theme

The store module uses the **shared light theme** (`src/theme/colors.ts` and `src/theme/spacing.ts`), same as auth/setup screens.

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#2563EB` | Buttons, active elements |
| `secondary` | `#10B981` | Success, delivered |
| `danger` | `#EF4444` | Cancelled, errors |
| `accent` | `#F59E0B` | Picked up, warnings |
| `background` | `#F8FAFC` | Screen background |
| `surface` | `#FFFFFF` | Card background |
| `text` | `#0F172A` | Primary text |
| `textSecondary` | `#64748B` | Secondary text |
| `border` | `#E2E8F0` | Card borders |
| `disabled` | `#CBD5E1` | Disabled elements |

### 4.2 Status Badge Colors

| Status | Background |
|--------|-----------|
| `pending` | `#DBEAFE` (blue light) |
| `driver_accepted` | `#F3E8FF` (purple light) |
| `driver_arrived_store` | `#FEF3C7` (yellow light) |
| `picked_up` | `#FEF3C7` (yellow light) |
| `on_the_way` | `#FFEDD5` (orange light) |
| `delivered` | `#D1FAE5` (green light) |
| `cancelled` | `#FEE2E2` (red light) |

### 4.3 Typography
- Same as shared theme: `fontSize.xs(12)`, `sm(14)`, `md(16)`, `lg(18)`, `xl(24)`, `xxl(32)`
- Font weights: 700 (bold headings), 600 (semibold), 500 (medium)

### 4.4 Spacing
- Same as shared theme: `xs(4)`, `sm(8)`, `md(16)`, `lg(24)`, `xl(32)`, `xxl(48)`

### 4.5 Border Radius
- `sm(4)`, `md(8)`, `lg(16)`, `xl(24)`, `full(9999)`

### 4.6 Tab Bar
- Light background (likely white or light gray)
- Blue active tint, gray inactive tint

---

## 5. Database Tables Used

| Table | Usage | Screens |
|-------|-------|---------|
| `profiles` | Owner/staff identity | All (via auth-store) |
| `stores` | Store info, location | Order list, create order |
| `store_staff` | Employee permissions | Settings (future) |
| `delivery_orders` | All order data | Order list, detail, create |
| `customers` | Customer lookup | Create order (via RPC) |
| `customer_addresses` | Saved addresses | Create order (future) |
| `order_status_history` | Timeline | Order detail |
| `drivers` | Driver info (assigned) | Order detail |
| `driver_locations` | Live tracking | Order detail |
| `shipment_types` | Order categories | Create order |
| `wallets` | Store balance | Wallet (future) |
| `wallet_transactions` | Financial history | Wallet (future) |
| `conversations` | Chat per order | Conversations |
| `conversation_participants` | Chat members | Conversations |
| `messages` | Chat messages | Chat |
| `notifications` | In-app notifications | Header bell |

---

## 6. RPCs Used

| RPC | Parameters | Returns | Called From |
|-----|-----------|---------|-------------|
| `ensure_customer_by_phone` | p_phone, p_name | UUID | create-order |
| `is_store_owner` | store_id | BOOLEAN | RLS helper |

---

## 7. Realtime Subscriptions

| Channel Name | Table | Event | Filter | Screens |
|-------------|-------|-------|--------|---------|
| Store orders | delivery_orders | * | store_id | Order list |
| Order detail | delivery_orders | UPDATE | id | Order detail |
| Store driver location | driver_locations | INSERT | driver_id | Order detail (live tracking) |

---

## 8. States: Loading, Empty, Error

| Screen | Loading | Empty | Error | Offline |
|--------|---------|-------|-------|---------|
| Orders List | ✅ Basic spinner | ⚠️ Needs illustration | ❌ Not handled | ❌ Not handled |
| Create Order | ❌ Not handled | N/A | ❌ Not handled | ❌ Not handled |
| Order Detail | ✅ Basic spinner | ✅ "Order not found" | ❌ Not handled | ❌ Not handled |

---

## 9. Existing vs Missing — Complete Inventory

### 9.1 What Exists ✅

| # | Feature | Screen | Status |
|---|---------|--------|--------|
| 1 | Orders List | index.tsx | ✅ |
| 2 | Create Order | create-order.tsx | ✅ |
| 3 | Map Pickup/Delivery | create-order | ✅ |
| 4 | Order Detail | [orderId].tsx | ✅ |
| 5 | Live Tracking Map | [orderId].tsx | ✅ |
| 6 | Driver Info + Call | [orderId].tsx | ✅ |
| 7 | Chat Link | [orderId].tsx | ✅ |
| 8 | Status Timeline | [orderId].tsx | ✅ |
| 9 | Payment Details | [orderId].tsx | ✅ |
| 10 | Conversations | conversations.tsx | ✅ |
| 11 | Profile | profile.tsx | ✅ |
| 12 | Notifications | Header button | ✅ |

### 9.2 What's Missing ❌

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 1 | **Store Dashboard** | High | Stats, charts, KPIs |
| 2 | **Customer Management** | High | List, search, history |
| 3 | **Store Wallet** | High | Balance, transactions, payouts |
| 4 | **Store Analytics** | High | Revenue, orders, trends |
| 5 | **Order Management** | Medium | Cancel, edit, resend |
| 6 | **Employee Management** | Medium | Staff CRUD, permissions |
| 7 | **Store Settings** | Medium | Profile, hours, defaults |
| 8 | **Branch Management** | Low | Multi-location |
| 9 | **Delivery Proof View** | Medium | Photo/signature after delivery |
| 10 | **Status Filter Tabs** | Medium | Order list filters |
| 11 | **Order Search** | Low | By number or customer |
| 12 | **Skeleton Loading** | Medium | Replace spinners |
| 13 | **Offline Support** | Medium | NetInfo + banner |
| 14 | **Reorder / Duplicate** | Low | Quick reorder from history |
