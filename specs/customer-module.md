# FullDelivery — Customer Module Product Specification

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

The Customer Module enables end customers to track their orders in real-time, communicate with drivers, and manage their delivery experience.

### Current State
- **4 screens built** (3 tab screens + 1 hidden)
- **Order history** with real-time updates
- **Order detail** with live driver tracking map
- **Confirm delivery** button
- **Light theme** (shared with auth screens)

### Customer Types
- **Registered customer** — has a `profiles` record + `customers` record linked via `profile_id`
- **Guest customer** — only has a `customers` record (created via `ensure_customer_by_phone`), identified by phone number

---

## 2. Navigation Flow

### 2.1 Tab Structure

```
Orders (index)    Messages (conversations)    Profile (profile)
     |                   |                         |
     ├─ Order History    ├─ Shared Component        ├─ Shared Component
     ├─ Status Badges    └─ (see Shared Specs)      └─ (see Shared Specs)
     └─ Realtime Updates
```

### 2.2 Hidden Routes

```
[orderId].tsx    ← Order detail with live tracking + confirm delivery
```

### 2.3 Flow Diagram

```
[Orders History]
    │
    └──► Tap Order ──► [Order Detail]
                            │
                       ├── Store Info
                       ├── Driver Info (name, rating, phone, vehicle)
                       ├── Live Tracking Map
                       ├── Status Timeline
                       ├── Chat Link → [Chat Screen]
                       └── "Confirm Delivery" (when arrived)
```

---

## 3. Screen Specifications

### 3.1 Customer Orders History (index.tsx)

**Path:** `mobile/app/(app)/(customer)/index.tsx`  
**Status:** ✅ Built (basic)

#### Layout
```
┌──────────────────────────────────┐
│  My Orders        🔔 🔒          │  ← Header
├──────────────────────────────────┤
│  [Active] [Completed] [Cancelled]│  ← Status tabs
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ DLV-ORD-001    [On The Way]│  │
│  │ 🏪 Store Name              │  │  ← Order card
│  │ 📍 Drop-off Address        │  │
│  │ Today, 2:30 PM  1,500 YER  │  │
│  │ 👤 Driver: Ahmed ⭐4.8     │  │
│  └────────────────────────────┘  │
│  ...more cards...                │
└──────────────────────────────────┘
```

#### Data Sources
| Data | Source | Realtime |
|------|--------|----------|
| Customer orders | `delivery_orders` by customer_id or customer_phone | Yes (INSERT/UPDATE) |

#### Existing ✅
- FlatList of orders with real-time updates
- Order status badges
- Navigate to order detail on tap

#### Missing ❌
- **Status filter tabs** (Active / Completed / Cancelled)
- **Driver info** on card (name, rating)
- **Store name** on card
- **Price** display on card
- **Empty state** illustration
- **Pull-to-refresh**
- **Search** by order number
- **Reorder** button for completed orders
- **Pagination** for large order lists
- **Skeleton loading**

---

### 3.2 Customer Order Detail ([orderId].tsx)

**Path:** `mobile/app/(app)/(customer)/[orderId].tsx`  
**Status:** ✅ Built

#### Layout
```
┌──────────────────────────────────┐
│  Delivery Details                │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Order #    DLV-ORD-001     │  │
│  │ Status     [On The Way]    │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 🏪 Store                   │  │
│  │ Store Name                 │  │
│  │ 📍 Address                 │  │
│  │ 📞 [Call Store]            │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 👤 Driver                  │  │
│  │ Ahmed Mohammed    ⭐ 4.8  │  │
│  │ 🚗 Toyota  ·  1234 ABC    │  │  ← Driver card
│  │ 📞 [Call Driver] 💬 [Chat] │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Live Tracking              │  │
│  │         [MAP]              │  │  ← Map with driver marker
│  │   Store ●───● You          │  │  ← Route polyline
│  │   📍 2.3 km  ⏱ 12 min    │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Order Timeline             │  │
│  │ ✓ Order Placed  2:30 PM   │  │
│  │ ✓ Driver Assigned  2:35   │  │  ← Status history
│  │ ✓ Picked Up  3:00 PM      │  │
│  │ ● On The Way              │  │
│  │ ○ Delivered               │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Delivery Details           │  │
│  │ 📍 Drop-off Address        │  │
│  │ Apt/Floor: ...             │  │
│  │ Notes for Driver: ...     │  │
│  │ Payment: Cash  1,500 YER  │  │
│  └────────────────────────────┘  │
│                                  │
│  [  ✓ Confirm Delivery  ]       │  ← Only when arrived
└──────────────────────────────────┘
```

#### Data Sources
| Data | Source | Realtime |
|------|--------|----------|
| Order | `delivery_orders` | Yes (UPDATE) |
| Store | `stores` | No |
| Driver | `drivers` (via assigned_driver_id) | Yes (location) |
| Driver location | `driver_locations` | Yes (for tracking) |
| Timeline | `order_status_history` | No |

#### Existing ✅
- Order info with status badge
- Store info with call button
- Driver info with name, rating, vehicle, call, chat
- Live tracking map with driver-to-customer route
- Status timeline
- Delivery details (address, payment)
- Confirm delivery button (appears when status is `driver_arrived_destination`)
- Realtime updates for status and driver location

#### Missing ❌
- **ETA display** with countdown
- **Driver phone number** display
- **Delivery instructions** prominent display
- **Map auto-follow** driver location
- **Share tracking link** with family
- **Rate driver** after delivery
- **Cancel order** button (before driver accepted)
- **Contact support** option

---

### 3.3 Customer Addresses (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Address List** | Saved delivery addresses | High |
| **Add Address** | Map picker + label (Home/Work/Other) | High |
| **Edit Address** | Update address details | High |
| **Delete Address** | Remove saved address | High |
| **Set Default** | Mark as default delivery address | High |
| **Quick Select** | Choose address when placing order | Medium |

---

### 3.4 Customer Payment Methods (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Payment Methods List** | Saved payment methods | Medium |
| **Add Card** | Credit/debit card entry | Medium |
| **Set Default** | Default payment method | Medium |
| **Remove Card** | Delete saved method | Medium |

> Note: The database currently only supports `cash`, `card`, `wallet` as payment methods (enum). Wallet for customers would need to be implemented.

---

### 3.5 Rate Driver (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Rating Prompt** | After delivery, prompt to rate driver | High |
| **Star Rating** | 1-5 star selection | High |
| **Review Text** | Optional written feedback | High |
| **View Past Ratings** | History of rated deliveries | Low |

> Note: The `drivers` table has `average_rating` but there's no rating/review table yet. This needs database schema work.

---

### 3.6 Customer Settings (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Notification Preferences** | Which notifications to receive | Medium |
| **Language** | Arabic/English toggle | Medium |
| **Default Address** | Set default delivery address | Medium |
| **Account Info** | View/edit name, phone, email | Low |

---

## 4. Design System

The customer module uses the **shared light theme** (`src/theme/colors.ts` and `src/theme/spacing.ts`), same as auth/store screens.

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#2563EB` | Buttons, links |
| `secondary` | `#10B981` | Delivered, success |
| `danger` | `#EF4444` | Cancelled |
| `accent` | `#F59E0B` | In transit |
| `background` | `#F8FAFC` | Screen background |
| `surface` | `#FFFFFF` | Cards |
| `text` | `#0F172A` | Primary text |

---

## 5. Database Tables Used

| Table | Usage |
|-------|-------|
| `profiles` | Customer identity |
| `customers` | Customer profile, phone |
| `customer_addresses` | Saved addresses (future) |
| `delivery_orders` | Order data, status |
| `stores` | Store info |
| `drivers` | Driver info, rating, vehicle |
| `driver_locations` | Live GPS tracking |
| `order_status_history` | Timeline |
| `conversations` | Chat per order |
| `conversation_participants` | Chat members |
| `messages` | Chat messages |
| `notifications` | In-app notifications |

---

## 6. RPCs Used

| RPC | Purpose |
|-----|---------|
| `ensure_conversation` | Find-or-create chat conversation |

---

## 7. Realtime Subscriptions

| Channel Name | Table | Event | Filter |
|-------------|-------|-------|--------|
| Customer orders | delivery_orders | INSERT/UPDATE | by customer_id or customer_phone |
| Order detail | delivery_orders | UPDATE | id |
| Driver location | driver_locations | INSERT | driver_id for live tracking |

---

## 8. States: Loading, Empty, Error

| Screen | Loading | Empty | Error | Offline |
|--------|---------|-------|-------|---------|
| Orders List | ✅ Basic | ❌ Missing | ❌ Not handled | ❌ Not handled |
| Order Detail | ✅ Basic | ✅ "Order not found" | ❌ Not handled | ❌ Not handled |

---

## 9. Existing vs Missing — Complete Inventory

### 9.1 What Exists ✅

| # | Feature | Screen | Status |
|---|---------|--------|--------|
| 1 | Order History | index.tsx | ✅ |
| 2 | Real-time Updates | index.tsx | ✅ |
| 3 | Order Detail | [orderId].tsx | ✅ |
| 4 | Store Info + Call | [orderId].tsx | ✅ |
| 5 | Driver Info (name, rating, vehicle) | [orderId].tsx | ✅ |
| 6 | Call Driver | [orderId].tsx | ✅ |
| 7 | Chat Link | [orderId].tsx | ✅ |
| 8 | Live Tracking Map | [orderId].tsx | ✅ |
| 9 | Status Timeline | [orderId].tsx | ✅ |
| 10 | Confirm Delivery | [orderId].tsx | ✅ |
| 11 | Conversations | conversations.tsx | ✅ |
| 12 | Profile | profile.tsx | ✅ |
| 13 | Notifications | Header button | ✅ |

### 9.2 What's Missing ❌

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 1 | **Rate Driver** | High | Requires new DB table |
| 2 | **Saved Addresses** | High | customer_addresses exists in DB |
| 3 | **Status Filter Tabs** | Medium | Order list filtering |
| 4 | **Reorder Button** | Medium | One-tap reorder |
| 5 | **Search Orders** | Medium | By order number |
| 6 | **Payment Methods** | Medium | Stored payment methods |
| 7 | **Share Tracking** | Low | Share link with family |
| 8 | **Cancel Order** | Medium | Before driver accepted |
| 9 | **Contact Support** | Low | In-app support |
| 10 | **Driver Phone Display** | Medium | Show driver's phone number |
| 11 | **ETA Countdown** | Low | Live ETA updates |
| 12 | **Offline Support** | Medium | NetInfo + banner |
| 13 | **Skeleton Loading** | Medium | Replace spinners |
