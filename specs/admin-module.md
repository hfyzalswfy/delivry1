# FullDelivery — Admin Module Product Specification

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
7. [Existing vs Missing](#7-existing-vs-missing)

---

## 1. Overview

The Admin Module provides platform-wide management capabilities: overseeing drivers, stores, customers, orders, financials, and system configuration.

### Current State
- **0 screens built** — the admin role does NOT have a dedicated route group
- Admin users are currently **redirected to the Store layout** via `useAuthGuard` role map: `admin → /(app)/(store)`
- The database already supports admin operations:
  - `admin_soft_delete_user()` and `admin_restore_user()` RPCs
  - `admin_*` RLS policies on most tables
  - `is_admin()` helper function
  - `profiles.is_active` and `profiles.deleted_at` for soft-delete

### Admin Capabilities (Database)
| Capability | Supported? |
|-----------|-----------|
| View all drivers | ✅ via RLS `admin_read_all` |
| View all stores | ✅ via RLS `admin_read_all` |
| View all customers | ✅ via RLS `admin_read_all` |
| View all orders | ✅ via RLS `admin_select` |
| Soft-delete users | ✅ via RPC |
| Restore users | ✅ via RPC |
| Manage notifications | ✅ via `admin_insert/update` policies |
| View wallets | ✅ via RLS `admin_read` |
| View all conversations | ✅ via RLS `admin_select` |

---

## 2. Navigation Flow

### 2.1 Tab Structure (Proposed)

```
Dashboard (index)    Drivers    Stores    Customers    Orders    Settings
     │                  │         │            │         │           │
     ├─ KPIs            ├─ List   ├─ List      ├─ List   ├─ List     ├─ Platform Config
     ├─ Charts          ├─ Detail ├─ Detail    ├─ Detail ├─ Detail   ├─ Notifications
     ├─ Recent Activity ├─ Verify ├─ Approve   ├─ Block  ├─ Status   ├─ Audit Log
     └─ Quick Actions   └─ Doc    └─ Suspend   └─ Merge  └─ Assign  └─ Roles
```

### 2.2 Route Structure (Proposed)

```
(app)/(admin)/
    _layout.tsx              ← Admin tab layout
    index.tsx                ← Dashboard
    drivers.tsx              ← Driver list
    drivers/[id].tsx         ← Driver detail + documents
    stores.tsx               ← Store list
    stores/[id].tsx          ← Store detail
    customers.tsx            ← Customer list
    customers/[id].tsx       ← Customer detail
    orders.tsx               ← All orders
    orders/[id].tsx          ← Order detail (admin view)
    wallet.tsx               ← Platform wallet overview
    reports.tsx              ← Reports & analytics
    complaints.tsx           ← Complaint management
    settings.tsx             ← Platform settings
```

---

## 3. Screen Specifications

### 3.1 Admin Dashboard (MISSING)

**Status:** ❌ Not built

#### Layout
```
┌──────────────────────────────────┐
│  Admin Dashboard                  │
├──────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ 📦    │ │ 👤   │ │ 🏪   │     │  ← KPI Cards (4 across)
│  │ 1,234 │ │ 56   │ │ 23   │     │
│  │ Orders│ │Driver│ │Store │     │
│  └──────┘ └──────┘ └──────┘     │
│  ┌──────┐                        │
│  │ 💰   │                        │
│  │$45K  │                        │
│  │Revenue│                        │
│  └──────┘                        │
│                                  │
│  ┌────────────────────────────┐  │
│  │   Orders This Week         │  │  ← Chart
│  │   ▁▃▅▇▆▄▃  (bar chart)    │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Recent Activity             │  │  ← Live feed
│  │ • Driver Ahmed verified     │  │
│  │ • New store: Cafe Dreams    │  │
│  │ • Order #1234 delivered     │  │
│  │ • Complaint resolved        │  │
│  └────────────────────────────┘  │
│                                  │
│  Quick Actions                   │
│  [Verify Drivers] [New Store]    │
│  [Reports] [Settings]           │
└──────────────────────────────────┘
```

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **KPI Cards** | Total orders, active drivers, stores, revenue | High |
| **Order Chart** | Daily/weekly order volume (bar/line) | High |
| **Revenue Chart** | Revenue trend with platform commission | High |
| **Recent Activity** | Live feed of platform events | High |
| **Driver Verification Queue** | Pending document approvals count | High |
| **Quick Actions** | Common admin tasks | Medium |

---

### 3.2 Driver Management (MISSING)

**Status:** ❌ Not built

#### Layout (List)
```
┌──────────────────────────────────┐
│  ← Drivers            🔍 [+ ]  │
├──────────────────────────────────┤
│  [All] [Pending] [Verified] [Bl] │  ← Status tabs
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 👤 Ahmed Mohammed          │  │
│  │ 📞 +967 700 000 000       │  │
│  │ 🚗 Toyota · 1234 ABC      │  │
│  │ ⭐ 4.8 · 156 deliveries    │  │
│  │ [Pending Docs]             │  │  ← Status badge
│  └────────────────────────────┘  │
│  ...more rows...                 │
└──────────────────────────────────┘
```

#### Layout (Detail)
```
┌──────────────────────────────────┐
│  Driver Detail                   │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Profile Info: Name, Phone, │  │
│  │ Email, Avatar, Rating      │  │
│  │ Status: [Active] [Suspend] │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Vehicle: Toyota · 1234 ABC │  │
│  │ · Blue                     │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Documents                  │  │
│  │ 📄 Driver's License  [✓]  │  │  ← Approve/Reject
│  │ 📄 Vehicle Reg      [⏳]  │  │
│  │ 📄 ID Card           [✗]  │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Stats: Total Del, Earnings │  │
│  │ This Week, Avg Rating     │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Recent Orders (last 10)    │  │
│  │ ┌─ Order cards ─────────┐  │  │
│  │ └───────────────────────┘  │  │
│  └────────────────────────────┘  │
│                                  │
│  [  Send Notification  ]        │
│  [  Suspend Driver     ]        │
└──────────────────────────────────┘
```

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Driver List** | All drivers with search, filter, sort | High |
| **Status Tabs** | All, Pending, Verified, Suspended | High |
| **Driver Detail** | Full profile, vehicle, documents | High |
| **Document Approval** | View/approve/reject driver documents | High |
| **Statistics** | Delivery count, earnings, rating | High |
| **Send Notification** | Push notification to driver | Medium |
| **Suspend/Activate** | Toggle driver's `is_active` status | High |
| **Recent Orders** | Driver's recent delivery history | Medium |
| **Delete Driver** | Soft-delete driver account | Low |

---

### 3.3 Store Management (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Store List** | All stores with search, filter, sort | High |
| **Status Tabs** | All, Active, Suspended, Pending | High |
| **Store Detail** | Profile, owner info, stats, orders | High |
| **Approve/Reject** | Store registration approval | High |
| **Suspend/Activate** | Toggle `is_active` status | High |
| **Owner Info** | Linked store owner profile | Medium |
| **Order History** | Store's order history | Medium |
| **Staff Management** | View store staff members | Low |

---

### 3.4 Customer Management (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Customer List** | All customers with search, filter | High |
| **Customer Detail** | Profile, order history, addresses | High |
| **Block/Unblock** | Suspend customer account | Medium |
| **Merge Customers** | Merge guest + registered profiles | Medium |
| **Order History** | Per-customer order list | Medium |

---

### 3.5 Orders Overview (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **All Orders** | Platform-wide order list | High |
| **Status Filters** | By any order status | High |
| **Date Range** | Filter by creation date | High |
| **Store/Driver Filter** | Filter by store or driver | High |
| **Order Detail** | Admin view of any order | High |
| **Force Update Status** | Admin override of order status | Medium |
| **Reassign Driver** | Change assigned driver | Medium |
| **Export** | Export orders to CSV | Low |

---

### 3.6 Platform Wallet / Financials (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Platform Revenue** | Total commissions collected | High |
| **Pending Payouts** | Driver/store pending payouts | High |
| **Transaction Log** | All wallet_transactions | High |
| **Date Range** | Filter by date | High |
| **Export** | Export financial reports | Medium |

---

### 3.7 Incentives Management (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Bonus Rules** | Define reward_bonus criteria | Medium |
| **Active Incentives** | Current incentive programs | Medium |
| **Driver Rewards** | Per-driver bonus history | Medium |
| **Create Incentive** | New bonus program (peak hours, zone, etc.) | Medium |

---

### 3.8 Reports (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Order Reports** | Volume, status distribution, trends | High |
| **Revenue Reports** | Platform earnings, commission breakdown | High |
| **Driver Reports** | Performance, reliability, avg delivery time | High |
| **Store Reports** | Order volume, revenue, ratings | High |
| **Export PDF/CSV** | Downloadable reports | Medium |
| **Scheduled Reports** | Auto-generated daily/weekly reports | Low |

---

### 3.9 Complaints / Issues (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Issue List** | All `delivery_issues` with status | High |
| **Status Tabs** | Open, Resolved, All | High |
| **Issue Detail** | Full issue info + order context | High |
| **Resolve Issue** | Mark as resolved with notes | High |
| **Notify Parties** | Send notification on resolution | Medium |

---

### 3.10 Notification Management (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Send Broadcast** | Push notification to all drivers/stores | High |
| **Targeted Notification** | To specific user/group | High |
| **Notification History** | Past broadcast history | Medium |
| **Template Management** | Edit `notification_templates` | Low |

---

### 3.11 Platform Settings (MISSING)

**Status:** ❌ Not built

#### Required Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Commission Rate** | Platform commission percentage | High |
| **Driver Requirements** | Required documents checklist | Medium |
| **Order Defaults** | Default fee, max distance, etc. | Medium |
| **Support Contact** | Platform support phone/email | Low |
| **Terms & Privacy** | Legal document links | Low |

---

## 4. Design System

The admin module should use a **professional dashboard theme** — likely dark or semi-dark with accent colors for KPIs.

### Proposed Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `sidebarBg` | `#1E1E2E` | Sidebar/nav background |
| `mainBg` | `#F5F5F9` | Content background |
| `cardBg` | `#FFFFFF` | Cards |
| `primary` | `#6366F1` | Primary actions |
| `success` | `#22C55E` | Approved/Verified |
| `warning` | `#F59E0B` | Pending |
| `danger` | `#EF4444` | Rejected/Suspended |
| `text` | `#1E293B` | Primary text |
| `textSecondary` | `#64748B` | Secondary text |

> Note: Admin is currently the lowest priority module and should follow the visual patterns established in driver/store modules.

---

## 5. Database Tables Used

| Table | Usage |
|-------|-------|
| `profiles` | All user profiles |
| `drivers` | Driver management |
| `driver_documents` | Document verification |
| `stores` | Store management |
| `store_staff` | Store staff info |
| `customers` | Customer management |
| `customer_addresses` | Customer addresses |
| `delivery_orders` | All orders |
| `order_assignments` | Assignment history |
| `order_status_history` | Order audit trail |
| `delivery_issues` | Complaint management |
| `wallets` | All wallets |
| `wallet_transactions` | Financial audit |
| `conversations` | Chat overview |
| `messages` | Message audit |
| `notifications` | Notification management |
| `notification_templates` | Template editing |
| `shipment_types` | Shipment config |

---

## 6. RPCs Used

| RPC | Purpose |
|-----|---------|
| `is_admin()` | RLS helper |
| `admin_soft_delete_user()` | Soft-delete user |
| `admin_restore_user()` | Restore user |
| `add_wallet_transaction()` | Manual wallet adjustment |

---

## 7. Existing vs Missing

### 7.1 What Exists ✅

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Admin role in DB | ✅ | `user_role` enum includes `admin` |
| 2 | Admin RLS policies | ✅ | Most tables have `admin_*` policies |
| 3 | Admin RPCs | ✅ | Soft-delete, restore, wallet |
| 4 | Admin helper functions | ✅ | `is_admin()`, `user_role()` |

### 7.2 What's Missing ❌

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 1 | **Admin route group** | High | `(app)/(admin)/` directory does not exist |
| 2 | **Auth guard for admin** | High | Currently redirected to Store layout |
| 3 | **Dashboard** | High | KPIs, charts, activity feed |
| 4 | **Driver Management** | High | List, detail, document approval |
| 5 | **Store Management** | High | List, detail, approval |
| 6 | **Customer Management** | High | List, detail, block |
| 7 | **Orders Overview** | High | All orders, filter, detail |
| 8 | **Complaint Management** | High | Issue list, resolve |
| 9 | **Platform Wallet** | Medium | Revenue, transactions |
| 10 | **Reports & Analytics** | Medium | Charts, exports |
| 11 | **Notification Broadcast** | Medium | Push to users |
| 12 | **Incentive Management** | Medium | Bonus rules |
| 13 | **Platform Settings** | Medium | Commission, requirements |
| 14 | **Admin Profile** | Low | Profile + security |
