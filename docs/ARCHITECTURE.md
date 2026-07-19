# FullDelivery Architecture

## Application Architecture

### High-Level Overview

FullDelivery is a three-tier application:

```
┌─────────────────────────────────────────────────────┐
│                   Mobile App                         │
│          React Native + Expo + TypeScript            │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Screens  │  │ Zustand  │  │ Custom Hooks      │  │
│  │ (Expo    │  │ Stores   │  │ (realtime, auth,  │  │
│  │  Router) │  │          │  │  chat, location)  │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                 │             │
│  ┌────▼──────────────▼─────────────────▼──────────┐  │
│  │            Supabase Client (typed)              │  │
│  │     src/lib/supabase.ts + src/types/           │  │
│  └────────────────────┬────────────────────────────┘  │
└───────────────────────┼───────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────┐
│                    Supabase                            │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │            PostgreSQL (22 tables)                │  │
│  │  RLS Enabled on ALL tables                      │  │
│  │  62 migrations, 9 custom enums                  │  │
│  │  SECURITY DEFINER helper functions              │  │
│  └────────────────────┬────────────────────────────┘  │
│                       │                                │
│  ┌────────────────────▼────────────────────────────┐  │
│  │    Realtime (postgres_changes + presence)        │  │
│  │    9 tables in supabase_realtime publication     │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │    Edge Functions (Deno)                         │  │
│  │    - assign-order                               │  │
│  │    - send-notification                          │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │    Auth (email/password, JWT, RLS)               │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │    Storage (driver-documents bucket)             │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Supabase as backend** — Provides database, auth, realtime, storage, and edge functions in one platform
2. **Zustand over context** — Lightweight, no boilerplate, fine-grained subscriptions
3. **React Query for server state** — Caching, retry, stale management for non-realtime queries
4. **Expo Router** — File-based routing that mirrors the app's navigation structure
5. **RPCs for mutations** — All business logic in SECURITY DEFINER database functions
6. **Soft delete** — All tables use `deleted_at` + `is_active` instead of hard deletes

---

## Folder Architecture

### `/mobile/app/` — Screen Layer (Expo Router)

```
app/
├── _layout.tsx              # Root: QueryClientProvider, ThemeProvider, AuthGate
├── index.tsx                # Redirect → /(auth)/login
├── +not-found.tsx           # 404 handler
├── (auth)/                  # Authentication screens
│   ├── _layout.tsx          # Stack layout
│   ├── login.tsx            # Email/password login
│   └── register.tsx         # Registration with role selection
├── (setup)/                 # Post-registration setup
│   ├── _layout.tsx
│   └── index.tsx            # Role-specific setup (store/driver/customer)
└── (app)/                   # Authenticated app
    ├── _layout.tsx          # Stack layout, push notification init
    ├── (store)/             # Store module - Tab navigator
    │   ├── _layout.tsx      # Tab layout (Orders, Messages, Profile)
    │   ├── index.tsx        # Dashboard with stats
    │   ├── orders.tsx       # Order list (search, filter, pagination, realtime)
    │   ├── [orderId].tsx    # Order detail (timeline, tracking, actions)
    │   ├── customers.tsx    # Customer directory
    │   ├── settings.tsx     # Store settings
    │   ├── profile.tsx      # Store profile
    │   ├── conversations.tsx# Messages (re-export)
    │   ├── store-address.tsx# Address editor
    │   └── create-order/    # 6-step order creation flow
    │       ├── _layout.tsx
    │       ├── index.tsx    # Customer lookup
    │       ├── select-address.tsx
    │       ├── add-address.tsx
    │       ├── location-picker.tsx
    │       ├── order-details.tsx
    │       └── review.tsx
    ├── (driver)/            # Driver module - Tab navigator (23 screens)
    │   ├── _layout.tsx      # Tab layout (Home, Orders, Chat, Wallet, Profile)
    │   ├── index.tsx        # Home dashboard, available orders
    │   ├── orders.tsx       # Available / My Orders tabs
    │   ├── [orderId].tsx    # Order detail with contextual actions
    │   ├── wallet.tsx       # Wallet + earnings
    │   ├── profile.tsx      # Driver profile
    │   ├── rewards.tsx      # Achievements
    │   ├── documents.tsx    # Document uploads
    │   ├── settings.tsx     # Settings
    │   ├── confirm-acceptance.tsx
    │   ├── pickup-confirmation.tsx
    │   ├── en-route.tsx     # Live tracking + map
    │   ├── confirm-delivery.tsx
    │   ├── delivery-summary.tsx
    │   ├── report-issue.tsx
    │   ├── language.tsx
    │   ├── appearance.tsx
    │   ├── privacy.tsx
    │   ├── help.tsx
    │   ├── about.tsx
    │   ├── notification-settings.tsx
    │   ├── account-status.tsx
    │   └── conversations.tsx
    ├── (customer)/          # Customer module - Tab navigator
    │   ├── _layout.tsx      # Tab layout (Orders, Messages, Profile)
    │   ├── index.tsx        # Order list
    │   ├── [orderId].tsx    # Order detail with tracking
    │   ├── profile.tsx      # Profile with address management
    │   ├── conversations.tsx# Messages
    │   └── addresses/       # Address management
    │       ├── _layout.tsx
    │       ├── index.tsx    # Address list
    │       ├── new.tsx      # Add address
    │       ├── [addressId].tsx # Edit address
    │       └── complete-address.tsx # Onboarding
    ├── (chat)/              # Shared chat module
    │   ├── _layout.tsx
    │   └── [orderId].tsx    # Chat screen
    └── (notifications)/     # Shared notifications module
        ├── _layout.tsx
        └── index.tsx        # Notification list
```

### `/mobile/src/` — Application Core

```
src/
├── components/              # 24 reusable component files
│   ├── ui/                  # Generic UI primitives
│   │   ├── Button.tsx       # 7 variants: primary, secondary, danger, outline, ghost, success, warning
│   │   ├── Card.tsx         # Card + CardRow + CardDivider
│   │   ├── StatusBadge.tsx  # Order status pill (all 9 statuses mapped)
│   │   ├── Avatar.tsx       # Circular avatar with initial + role color
│   │   ├── EmptyState.tsx   # Icon + title + subtitle
│   │   ├── LoadingScreen.tsx # Centered spinner
│   │   ├── ScreenLayout.tsx # Scrollable + Section component
│   │   ├── SettingsRow.tsx  # Label + value/toggle/chevron
│   │   ├── TabIcon.tsx      # Tab bar icon
│   │   └── SharedMap.tsx    # Map with theme-aware OSM tiles
│   ├── profile/             # Shared profile components
│   │   ├── ProfileHeader.tsx
│   │   ├── ProfileStatsRow.tsx
│   │   ├── ProfileCard.tsx + ProfileInfoRow
│   │   ├── ProfileMenuSection.tsx
│   │   ├── ProfileSignOut.tsx
│   │   └── index.ts         # Barrel export
│   ├── store/               # Store-specific components
│   │   ├── DashboardHeader.tsx
│   │   ├── StatisticCard.tsx
│   │   ├── QuickActionCard.tsx
│   │   ├── RecentOrderItem.tsx
│   │   └── SearchBar.tsx
│   ├── driver/              # Driver-specific components
│   │   ├── DriverHeader.tsx
│   │   ├── DriverStatsGrid.tsx
│   │   ├── AvailableOrdersSection.tsx
│   │   ├── DriverQuickActions.tsx
│   │   └── DriverPerformanceSummary.tsx
│   ├── AddressCard.tsx      # Single address display
│   ├── AddressList.tsx      # Scrollable address list
│   ├── AddressForm.tsx      # Address form with map picker
│   ├── LocationPickerScreen.tsx # Full-screen map picker
│   ├── OrderReviewCard.tsx  # Order summary review
│   ├── OrderDetailForm.tsx  # Order details input
│   ├── ConversationsScreen.tsx # Chat list (shared)
│   ├── BackButton.tsx       # Safe back navigation
│   ├── SignOutButton.tsx    # Sign out with confirmation
│   └── NotificationsButton.tsx # Bell icon
├── hooks/                   # Custom hooks
│   ├── use-auth.ts          # useAuthGuard route guard
│   ├── use-chat.ts          # useConversation (real-time messaging)
│   ├── use-conversations.ts # Conversation list
│   ├── use-driver-location.ts # GPS tracking
│   ├── use-driver-orders.ts # Driver's orders (realtime)
│   ├── use-driver-profile.ts# Driver record
│   ├── use-notifications-list.ts # Notification feed (realtime)
│   ├── use-order-guard.ts   # Order status route guard
│   ├── use-push-token.ts    # Push notification registration
│   └── store/               # Store-specific hooks
│       └── use-store-dashboard.ts # Dashboard data + realtime
├── store/                   # Zustand state stores
│   ├── auth-store.ts        # Auth state (session, user, profile)
│   ├── create-order-store.ts# Order creation flow state
│   └── settings-store.ts    # Theme + notification preferences
├── services/
│   └── delivery-service.ts  # RPC wrapper functions (arriveAtStore, completeDelivery, etc.)
├── lib/
│   ├── supabase.ts          # Typed Supabase client
│   └── geo.ts              # isValidCoordinate, calculateDistance, calculateETA
├── theme/                   # Design system
│   ├── colors.ts           # Light + dark color schemes
│   ├── spacing.ts          # Spacing, fontSize, borderRadius, fontWeight, lineHeight, shadow
│   ├── ThemeProvider.tsx    # React context (useTheme, useFullTheme, useColors)
│   ├── driver-theme.ts     # Legacy backward compat
│   └── index.ts            # Central exports + typography presets + layout helpers
├── constants/
│   ├── icons.ts            # 112 MaterialIcons mappings
│   └── index.ts            # ROLE_COLORS, ROLE_CONFIG
├── types/
│   └── database.ts         # Full Supabase schema types (auto-generated)
└── i18n/                   # Internationalization
    ├── i18n.ts             # i18next config + locale detection
    ├── index.ts
    └── locales/
        ├── en.json         # 376 keys
        └── ar.json         # 376 keys
```

---

## Database Architecture

### Entity Relationship Overview

```
auth.users
    │ (1:1)
    ▼
profiles ────▶ wallets (1:1)
    │
    ├──▶ stores (1:1) ──▶ store_staff (1:N)
    ├──▶ customers (1:1 or null)
    │       └──▶ customer_addresses (1:N)
    ├──▶ drivers (1:1)
    │       └──▶ driver_documents (1:N)
    │
    ▼
delivery_orders (central table)
    ├──▶ stores (FK: store_id)
    ├──▶ customers (FK: customer_id)
    ├──▶ drivers (FK: assigned_driver_id)
    ├──▶ order_assignments (1:N)
    ├──▶ order_status_history (1:N)
    ├──▶ driver_locations (1:N) [during active order]
    ├──▶ delivery_issues (1:N)
    └──▶ conversations (1:1)
            ├──▶ conversation_participants (1:N)
            └──▶ messages (1:N)

notifications ──▶ profiles (FK)
push_tokens ────▶ profiles (FK)
```

### Migration Chain

All 62 migrations are sequential (001 → 062). Key phases:
- **001-002**: Foundation (enums, base functions, sequences)
- **003-017**: Table creation (21 tables + seed data)
- **019-039**: RLS policies (all tables covered)
- **040-062**: Extensions (RPCs, triggers, edge function support)

---

## State Management

### Zustand Store Separation

```
useAuthStore              useCreateOrderStore         useSettingsStore
────────────────────      ──────────────────────      ─────────────────
session: Session | null   customerId: string | null   theme: ThemeMode
user: User | null         customerName: string        loaded: boolean
profile: Profiles | null  pickupAddress: string       resolvedTheme
isLoading: boolean        deliveryAddress: string     notifications: {
isInitialized: boolean    shipmentTypeId: string | null   push, email, sms,
isAuthenticated: boolean  deliveryFee: string             orderUpdates,
needsSetup: boolean       paymentMethod: PaymentMethod    promotional
                          priority: OrderPriority      }
────────────────────      notesForDriver: string      ─────────────────
initialize()              selectedAddress              setTheme()
signIn() / signUp()       newlyAddedAddressId          setNotification()
signOut()                 ─────────────────────       load()
refreshProfile()          setCustomer()
setProfile()              setPickup()
checkRoleSetup()          setDelivery()
                          setOrderDetails()
                          setSelectedAddress()
                          setNewlyAddedAddressId()
                          reset()
```

### State Flow Pattern

```
User Action → Zustand Action → Screen Re-render → Supabase Query/RPC → Response → Update Store/State
```

Ephemeral/flow state → Zustand (create-order flow, theme preferences)
Server state → Supabase direct queries + React Query (for caching)
Realtime updates → Supabase channel subscriptions → setState in components

---

## Navigation

### Route Hierarchy

```
Root (Stack, headerShown: false)
├── (auth) [Stack]
│   ├── login
│   └── register
├── (setup) [Stack]
│   └── index
└── (app) [Stack, headerShown: false]
    ├── (store) [Tabs]
    │   ├── index        (Dashboard)
    │   ├── conversations(Messages)
    │   ├── profile      (Profile)
    │   ├── create-order  [Stack, hidden]
    │   ├── [orderId]     [hidden]
    │   ├── orders        [hidden]
    │   ├── customers     [hidden]
    │   └── settings      [hidden]
    ├── (driver) [Tabs]
    │   ├── index        (Home)
    │   ├── orders       (Orders)
    │   ├── conversations(Chat)
    │   ├── wallet       (Wallet)
    │   ├── profile      (Profile)
    │   └── 18 hidden screens
    ├── (customer) [Tabs]
    │   ├── index        (Orders)
    │   ├── conversations(Messages)
    │   ├── profile      (Profile)
    │   ├── [orderId]     [hidden]
    │   └── addresses/    [Stack, hidden]
    ├── (chat) [Stack]
    │   └── [orderId]
    └── (notifications) [Stack]
        └── index
```

### Navigation Guards

1. `useAuthGuard()` (root layout) — redirects unauthenticated → login, incomplete profile → setup
2. `useOrderGuard(orderId, expectedStatuses)` — protects driver detail screens against wrong status
3. Customer address check — redirects to address onboarding if no addresses saved
4. Create-order flow guards — redirects to start if essential data missing

---

## Realtime

### Subscription Pattern (MANDATORY)

```typescript
useEffect(() => {
  const channel = supabase.channel('unique-channel-name')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'table1', filter: '...' }, handler1)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'table2', filter: '...' }, handler2)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [dependencies]);
```

**CRITICAL**: All `.on()` callbacks must be registered BEFORE `.subscribe()`. Adding callbacks after subscription causes errors.

### Tables in `supabase_realtime` Publication

| Table | REPLICA IDENTITY | Purpose |
|-------|-----------------|---------|
| `messages` | DEFAULT | Chat messages |
| `conversations` | DEFAULT | Conversation updates |
| `conversation_participants` | DEFAULT | Sync participant list |
| `delivery_orders` | FULL | Order status changes (all columns in payload) |
| `drivers` | FULL | Driver availability/location updates |
| `notifications` | FULL | Real-time notification delivery |
| `wallet_transactions` | DEFAULT | Wallet activity |
| `order_status_history` | DEFAULT | Audit trail updates |
| `driver_locations` | DEFAULT | Live GPS tracking |

### Presence Channels (Chat Typing)

Used by `useConversation` hook for typing indicators:
- Channel: `chat:{orderId}`
- Presence key: user's profile ID
- Track: `{ typing: boolean }`

---

## RPC Layer

### Categories

**Order Lifecycle** (all SECURITY DEFINER):
```
accept_order(order_id, driver_id) → {success, assignment_id}
arrive_at_store(order_id, driver_id) → {success}
confirm_pickup(order_id, driver_id, proof_image_url?, notes?) → {success}
start_delivery(order_id, driver_id) → {success}
arrive_at_destination(order_id, driver_id) → {success}
complete_delivery(order_id, driver_id, verification_method, verification_data?) → {success, transaction_id, amount}
report_delivery_issue(order_id, driver_id, issue_type, description?) → {success, issue_id}
```

**Customer & Address** (all SECURITY DEFINER):
```
get_customer_info(phone) → TABLE (customer lookup)
get_customer_addresses(customer_id) → TABLE (addresses ordered by default)
add_customer_address(customer_id, address_text, latitude, longitude, ...) → JSONB (new address)
ensure_customer_by_phone(phone, name?) → UUID (find or create)
```

**Wallet** (SECURITY DEFINER):
```
add_wallet_transaction(wallet_id, amount, type, description?, reference_type?, reference_id?) → UUID
```
Uses `SELECT ... FOR UPDATE` for atomicity.

**Chat** (SECURITY DEFINER):
```
ensure_conversation(order_id, profile_id, participant_role) → UUID
```

**Admin** (SECURITY DEFINER):
```
admin_soft_delete_user(user_id) → void
admin_restore_user(user_id) → void
```

### RPC Design Principles

1. All return JSONB with `{ success: boolean }` pattern
2. Verify `auth.uid()` at function start
3. SECURITY DEFINER for cross-table business logic
4. `SELECT FOR UPDATE` for wallet operations (prevents race conditions)
5. Include audit trail logging (order_status_history inserts)
6. Idempotent where possible (complete_delivery returns success if already delivered)

---

## Shared Components

### Component Dependency Hierarchy

```
SharedMap
AddressForm ──▶ SharedMap
LocationPickerScreen ──▶ SharedMap
AddressList ──▶ AddressCard
AddressCard ──▶ StatusBadge
OrderReviewCard ──▶ Card
OrderDetailForm ──▶ Card

ScreenLayout
  └── Section

ProfileHeader ──▶ Avatar
ProfileStatsRow
ProfileCard ──▶ ProfileInfoRow
ProfileMenuSection ──▶ MaterialIcons
ProfileSignOut ──▶ Button (reuses Button variant pattern)

DashboardHeader ──▶ Avatar
StatisticCard
QuickActionCard
RecentOrderItem ──▶ StatusBadge
SearchBar

DriverHeader
DriverStatsGrid
AvailableOrdersSection ──▶ StatusBadge
DriverQuickActions
DriverPerformanceSummary

ConversationsScreen ──▶ Avatar, EmptyState
BackButton
SignOutButton ──▶ Alert
NotificationsButton

Button ──▶ MaterialIcons, ActivityIndicator
Card
StatusBadge
Avatar
EmptyState
LoadingScreen
SettingsRow ──▶ Switch, MaterialIcons
TabIcon
```

### Reuse Rules

1. Components in `ui/` and `profile/` are shared across ALL roles
2. Components in `store/` are store-specific — don't use in driver/customer
3. Components in `driver/` are driver-specific — don't use in store/customer
4. Address/form components at component root are shared across store and customer
5. Never duplicate a component — always check existing components first

---

## Shared Hooks

### Hook Dependency Map

```
useAuthGuard ──▶ useAuthStore, expo-router segments
useConversation ──▶ supabase, useAuthStore, presence
useConversations ──▶ supabase, useAuthStore
useDriverLocation ──▶ supabase, useAuthStore, expo-location
useDriverOrders ──▶ supabase, useAuthStore
useDriverProfile ──▶ supabase, useAuthStore
useNotificationsList ──▶ supabase, useAuthStore
useOrderGuard ──▶ supabase, useAuthStore
usePushToken ──▶ supabase, useAuthStore, expo-notifications
useStoreDashboard ──▶ supabase, useAuthStore
```

### Creating New Hooks

1. Place in `src/hooks/` for cross-role hooks
2. Place in `src/hooks/store/` for store-specific hooks
3. Follow naming: `use[Domain]` pattern
4. Accept parameters for configuration
5. Return typed object (never `any`)
6. Handle loading/error states
7. Clean up subscriptions in effect returns

---

## Service Layer

### `delivery-service.ts`

Wraps all 7 delivery lifecycle RPCs:

```typescript
arriveAtStore(orderId, driverId)         → calls arrive_at_store RPC
confirmPickup(orderId, driverId, photo?, notes?) → calls confirm_pickup RPC
startDelivery(orderId, driverId)         → calls start_delivery RPC
arriveAtDestination(orderId, driverId)   → calls arrive_at_destination RPC
completeDelivery(orderId, driverId, method, data?) → calls complete_delivery RPC
reportDeliveryIssue(orderId, driverId, type, desc?) → calls report_delivery_issue RPC
```

All return `DeliveryResult = { success: true; error: null } | { success: false; code: string; error: string }`

---

## Data Flow

### Order Creation Flow

```
StoreUser                    Supabase                    Customer
    │                           │                          │
    ├─ enter phone ────────────►│                          │
    │                           ├─ get_customer_info() ───►│
    │                           │◄── {id, name} ───────────┤
    │◄── customer found ───────┤                          │
    │                           │                          │
    ├─ select/create address ──►│                          │
    │                           ├─ get_customer_addresses()│
    │                           │◄── addresses[]          │
    │                           │                          │
    ├─ (or) add_customer_address()                        │
    │                           ├─ add_customer_address() │
    │                           │◄── new address          │
    │                           │                          │
    ├─ fill order details ─────►│                          │
    │                           │                          │
    ├─ review & create ────────►│                          │
    │                           ├─ ensure_customer_by_phone()
    │                           ├─ INSERT delivery_orders  │
    │                           ├─ trigger: notify drivers│
    │                           ├─ trigger: create_conv   │
    │◄── success ──────────────┤                          │
```

### Delivery Lifecycle Flow

```
Driver                      Supabase                    Store/Customer
  │                           │                            │
  ├─ accept_order() ────────►│                            │
  │                           ├─ create order_assignment   │
  │                           ├─ trigger: sync driver      │
  │                           ├─ status: driver_accepted   │
  │◄── success ──────────────┤                            │
  │                           │                            │
  ├─ arrive_at_store() ─────►│                            │
  │                           ├─ status: driver_arrived_store│
  │◄── success ──────────────┤                            │
  │                           │                            │
  ├─ confirm_pickup() ──────►│                            │
  │                           ├─ status: picked_up         │
  │◄── success ──────────────┤                            │
  │                           │                            │
  ├─ start_delivery() ──────►│                            │
  │                           ├─ status: on_the_way        │
  │◄── success ──────────────┤                            │
  │                           │                            │
  ├─ GPS tracking ──────────►│                            │
  │  (every 5s)              ├─ INSERT driver_locations    │
  │                          ├─ update drivers.current_*  │
  │                          │◄── realtime: store+ Customer│
  │                           │                            │
  ├─ arrive_at_destination()►│                            │
  │                           ├─ status: driver_arrived_   │
  │                           │   destination              │
  │◄── success ──────────────┤                            │
  │                           │                            │
  ├─ complete_delivery() ───►│                            │
  │                           ├─ verify OTP/photo/sig     │
  │                           ├─ status: delivered         │
  │                           ├─ add_wallet_transaction    │
  │                           │   (credit driver earnings) │
  │                           ├─ increment total_deliveries│
  │                           ├─ trigger: notify all      │
  │◄── success + tx_id ──────┤                            │
```

---

## Dependency Rules

### Import Direction

```
app/* (screens) ────────► src/components/*
app/* (screens) ────────► src/hooks/*
app/* (screens) ────────► src/store/*
app/* (screens) ────────► src/services/*
app/* (screens) ────────► src/lib/*
app/* (screens) ────────► src/theme/*
app/* (screens) ────────► src/constants/*
app/* (screens) ────────► src/types/*

src/components/* ────────► src/theme/*
src/components/* ────────► src/lib/*
src/components/* ────────► src/constants/*
src/components/* ────────► src/types/*

src/hooks/* ────────────► src/store/*
src/hooks/* ────────────► src/lib/*
src/hooks/* ────────────► src/types/*

src/services/* ─────────► src/lib/*

src/store/* ────────────► src/types/*
src/store/* ────────────► src/lib/*
```

### Prohibited Dependency Patterns

- Screens should NOT import from other role modules: `(store)/` ← ✗ → `(driver)/`
- Components should NOT import from hooks
- Stores should NOT import from components
- hooks should NOT import from services
- No circular dependencies (checked: graph is acyclic)
- No direct Supabase queries from components — use hooks or inline in screens
