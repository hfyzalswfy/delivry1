# FullDelivery

On-demand last-mile delivery platform connecting stores, drivers, and customers through a unified mobile application.

## Description

FullDelivery is a production-grade delivery management system built with React Native (Expo SDK 55), Supabase, and TypeScript 5.9. The platform enables stores to create and manage delivery orders, drivers to accept and complete deliveries with real-time GPS tracking and OTP/photo verification, and customers to track orders in real time through an integrated chat, notification, and wallet system.

## Vision

Create the most reliable and efficient last-mile delivery ecosystem in the Middle East by providing a seamless, real-time platform connecting every stakeholder in the delivery process with transparent tracking, instant communication, and automated financial settlement.

## Business Model

FullDelivery operates on a commission-based marketplace model:

- **Stores** pay a platform commission per delivery (`delivery_orders.platform_commission`)
- **Drivers** earn delivery fees plus reward bonuses (`driver_earnings` + `reward_bonus`)
- **Wallet** transactions are atomic — drivers are credited immediately upon delivery completion via SECURITY DEFINER RPC with `SELECT FOR UPDATE` row locking
- **Payment methods**: `cash`, `card`, `wallet`

## Supported Roles

### Store
Create and manage delivery orders, view customer history, access real-time dashboard with statistics, manage store profile and address, track orders on live map, communicate via in-app chat, access customer directory aggregated from order history.

### Driver
Browse available orders, accept deliveries, navigate with Google Maps deep links, track GPS location in real time, verify delivery via OTP/photo/signature, manage wallet and earnings, upload documents for verification, view rewards and achievements, communicate with stores and customers via chat.

### Customer
Track orders in real time on a live map, manage saved addresses, communicate with drivers and stores via chat, receive push notifications for order status changes, confirm delivery directly from the app.

### Admin
Bypass RLS via JWT claim-based `is_admin()` check, soft-delete and restore users, full read access across all tables.

## Technology Stack

| Category | Technology |
|----------|-----------|
| **Mobile Framework** | React Native 0.83.6 with Expo SDK 55 |
| **Routing** | Expo Router 4.x (file-based, tabs + stacks) |
| **Language** | TypeScript 5.9 |
| **Backend & Database** | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| **State Management** | Zustand 5 (auth, create-order, settings) |
| **Server State** | TanStack React Query 5 (retry: 2, staleTime: 30s) |
| **Maps** | react-native-maps + OpenStreetMap tiles (CartoDB via UrlTile) |
| **Navigation** | Google Maps deep links for turn-by-turn |
| **Real-time** | Supabase Realtime (postgres_changes + presence) |
| **Push Notifications** | Expo Notifications + Supabase Edge Functions |
| **Internationalization** | i18next + react-i18next (English + Arabic, 376 keys each) |
| **Icons** | @expo/vector-icons (MaterialIcons) |
| **Storage** | AsyncStorage for settings persistence |
| **CI/Dev** | Supabase CLI 2.106, Deno for Edge Functions |

## Project Architecture

### Authentication
Supabase Auth with email/password. On sign-up, a profile is created in `profiles` (1:1 with `auth.users`). A JWT trigger adds the `user_role` claim. The `useAuthGuard` hook protects routes: unauthenticated → login, missing role record → setup.

### Navigation
Expo Router file-based routing. Three tab-based role modules under `(app)/`:
- `(store)/` — Orders, Messages, Profile tabs (with hidden detail/creation/settings stacks)
- `(driver)/` — Home, Orders, Chat, Wallet, Profile tabs (23 screens total)
- `(customer)/` — Orders, Messages, Profile tabs (with address management sub-flow)

Shared `(chat)/` and `(notifications)/` modules provide cross-role functionality.

### State Management
Three Zustand stores: `useAuthStore` (session/user/profile), `useCreateOrderStore` (multi-step order creation flow), `useSettingsStore` (theme, notification preferences).

### Database
PostgreSQL with 22 tables, 9 custom enum types, 62 migrations. Soft-delete pattern (`deleted_at`, `is_active`) on all tables. RLS enabled on all tables with SECURITY DEFINER helper functions to break recursion. Atomic wallet transactions with `SELECT FOR UPDATE`.

### Realtime
Supabase Realtime listens to `postgres_changes` on 9 tables via `supabase_realtime` publication: `messages`, `conversations`, `conversation_participants`, `delivery_orders`, `drivers`, `notifications`, `wallet_transactions`, `order_status_history`, `driver_locations`. Pattern: `.channel()` → all `.on()` → `.subscribe()`.

### RPC
All order lifecycle mutations go through SECURITY DEFINER RPCs: `accept_order`, `arrive_at_store`, `confirm_pickup`, `start_delivery`, `arrive_at_destination`, `complete_delivery`, `report_delivery_issue`. Address operations: `add_customer_address`, `get_customer_addresses`, `get_customer_info`. Wallet: `add_wallet_transaction`.

### Maps
`react-native-maps` with `provider={undefined}` and `UrlTile` overlay serving CartoDB tiles (light/dark theme-aware). `SharedMap` component provides reusable wrapper. Google Maps deep links used for driver navigation.

### Notifications
Two-part system: (1) DB triggers insert into `notifications`, (2) Edge Function `send-notification` reads `push_tokens` and sends via Expo Push API. In-app: `useNotificationsList` hook with real-time subscription.

### Chat
One conversation per order (1:1 with `delivery_orders`). `ensure_conversation` RPC creates/retrieves conversation. `useConversation` hook provides real-time messaging with typing indicators via Realtime presence. Drivers auto-added via `add_driver_to_conversation` trigger.

### Wallet
One wallet per profile (auto-created on profile insert). Balance as `DECIMAL(12,2)` with `is_frozen`. All mutations through `add_wallet_transaction` with `SELECT FOR UPDATE`. Driver earnings credited atomically in `complete_delivery`.

### Orders
Central `delivery_orders` table. Lifecycle: `pending` → `published` → `driver_accepted` → `driver_arrived_store` → `picked_up` → `on_the_way` → `driver_arrived_destination` → `delivered`. Cancellation from any status. Order number format: `ORD-YYYYMMDD-XXXXX`.

### Profiles
Shared component library at `src/components/profile/`: `ProfileHeader`, `ProfileStatsRow`, `ProfileCard`, `ProfileMenuSection`, `ProfileSignOut`. Each role's profile screen uses these with role-specific data.

## Folder Structure

```
fulldelivery/
├── mobile/                          # React Native / Expo application
│   ├── app/                         # Expo Router screens (57+ files)
│   │   ├── _layout.tsx              # Root: QueryClient, AuthGate, Theme
│   │   ├── index.tsx                # Redirect → /login
│   │   ├── +not-found.tsx           # 404 screen
│   │   ├── (auth)/                  # Login, Register
│   │   ├── (setup)/                 # Post-registration setup per role
│   │   └── (app)/                   # Authenticated app
│   │       ├── (store)/             # Store module (12 screens)
│   │       │   ├── _layout.tsx      # Tab: Orders, Messages, Profile
│   │       │   ├── index.tsx        # Dashboard with stats + realtime
│   │       │   ├── orders.tsx       # Order list (search/filter/pagination/realtime)
│   │       │   ├── [orderId].tsx    # Order detail + timeline + tracking
│   │       │   ├── customers.tsx    # Customer directory
│   │       │   ├── settings.tsx     # Store settings
│   │       │   ├── profile.tsx      # Store profile
│   │       │   ├── store-address.tsx# Address editor
│   │       │   ├── conversations.tsx# Messages (shared component)
│   │       │   └── create-order/    # 6-step creation flow
│   │       ├── (driver)/            # Driver module (23 screens)
│   │       │   ├── _layout.tsx      # Tab: Home, Orders, Chat, Wallet, Profile
│   │       │   ├── index.tsx        # Driver dashboard
│   │       │   ├── orders.tsx       # Available / My Orders tabs
│   │       │   ├── [orderId].tsx    # Order detail with contextual actions
│   │       │   ├── wallet.tsx       # Wallet + earnings
│   │       │   ├── profile.tsx      # Driver profile
│   │       │   ├── rewards.tsx      # Achievements
│   │       │   ├── documents.tsx    # Document uploads
│   │       │   └── ...              # confirm-acceptance, pickup-confirmation,
│   │       │                         # en-route, confirm-delivery, delivery-summary,
│   │       │                         # report-issue, language, appearance, privacy,
│   │       │                         # help, about, notification-settings, settings,
│   │       │                         # account-status, conversations
│   │       ├── (customer)/          # Customer module (10 screens)
│   │       │   ├── _layout.tsx      # Tab: Orders, Messages, Profile
│   │       │   ├── index.tsx        # Order list
│   │       │   ├── [orderId].tsx    # Order detail with tracking
│   │       │   ├── profile.tsx      # Profile with address management
│   │       │   ├── conversations.tsx# Messages (shared)
│   │       │   └── addresses/       # Address CRUD (4 screens)
│   │       ├── (chat)/              # Shared chat (2 files)
│   │       │   └── [orderId].tsx    # Full chat UI
│   │       └── (notifications)/     # Shared notifications (2 files)
│   │           └── index.tsx        # Notification list
│   ├── src/
│   │   ├── components/              # 24 reusable component files
│   │   │   ├── ui/                  # Button, Card, StatusBadge, Avatar, EmptyState,
│   │   │   │                         # LoadingScreen, ScreenLayout, SettingsRow,
│   │   │   │                         # TabIcon, SharedMap
│   │   │   ├── profile/             # ProfileHeader, ProfileStatsRow, ProfileCard,
│   │   │   │                         # ProfileMenuSection, ProfileSignOut
│   │   │   ├── store/               # DashboardHeader, StatisticCard, QuickActionCard,
│   │   │   │                         # RecentOrderItem, SearchBar
│   │   │   ├── driver/              # DriverHeader, DriverStatsGrid,
│   │   │   │                         # AvailableOrdersSection, DriverQuickActions,
│   │   │   │                         # DriverPerformanceSummary
│   │   │   ├── AddressCard.tsx      # Address display card
│   │   │   ├── AddressList.tsx      # Scrollable address list
│   │   │   ├── AddressForm.tsx      # Address form with map
│   │   │   ├── LocationPickerScreen.tsx # Full-screen map picker
│   │   │   ├── OrderReviewCard.tsx  # Order review summary
│   │   │   ├── OrderDetailForm.tsx  # Order detail input form
│   │   │   ├── ConversationsScreen.tsx # Conversation list
│   │   │   └── BackButton.tsx       # Safe back navigation
│   │   ├── hooks/                   # 11 custom hooks
│   │   │   ├── use-auth.ts          # Route guard
│   │   │   ├── use-chat.ts          # Real-time chat (useConversation)
│   │   │   ├── use-conversations.ts # Conversation list
│   │   │   ├── use-driver-location.ts # GPS tracking
│   │   │   ├── use-driver-orders.ts # Driver's orders
│   │   │   ├── use-driver-profile.ts# Driver record
│   │   │   ├── use-notifications-list.ts # Notification feed
│   │   │   ├── use-order-guard.ts   # Status route guard
│   │   │   ├── use-push-token.ts    # Push registration
│   │   │   └── store/use-store-dashboard.ts # Store dashboard
│   │   ├── store/                   # 3 Zustand stores
│   │   │   ├── auth-store.ts        # Auth lifecycle
│   │   │   ├── create-order-store.ts# Order creation flow
│   │   │   └── settings-store.ts    # Theme + notifications
│   │   ├── services/
│   │   │   └── delivery-service.ts  # RPC wrappers
│   │   ├── lib/
│   │   │   ├── supabase.ts          # Typed Supabase client
│   │   │   └── geo.ts              # Coordinates, distance, ETA
│   │   ├── theme/                   # Design system
│   │   │   ├── colors.ts           # Light + dark schemes
│   │   │   ├── spacing.ts          # Spacing, fontSize, borderRadius, shadow tokens
│   │   │   ├── ThemeProvider.tsx    # Context + hooks (useColors, useTheme, useFullTheme)
│   │   │   ├── driver-theme.ts     # Legacy backward compat
│   │   │   └── index.ts            # Central exports + typography + layout
│   │   ├── constants/
│   │   │   ├── icons.ts            # 112 MaterialIcons mappings
│   │   │   └── index.ts            # Role colors/config
│   │   ├── types/
│   │   │   └── database.ts         # Full Supabase schema types
│   │   └── i18n/                   # i18next EN/AR (376 keys each)
│   ├── assets/
│   ├── app.json                    # Expo config
│   └── tsconfig.json
├── supabase/
│   ├── migrations/                 # 62 SQL migrations
│   ├── functions/                  # 2 Edge Functions (Deno)
│   │   ├── assign-order/          # Publish + assign drivers
│   │   └── send-notification/     # Push via Expo API
│   ├── config.toml
│   └── EDGE_FUNCTIONS.md
├── reports/                        # 18 architecture/audit reports
├── docs/                           # Project documentation
├── specs/                          # Specifications
├── package.json                    # Supabase CLI dep
└── README.md
```

## Installation

### Requirements

- **Node.js:** >= 18
- **Expo CLI:** Included with Expo SDK 55
- **Android Studio:** For emulator (or physical device with Expo Go)
- **Supabase:** Project URL and anon key (local or hosted)

### Environment Variables

Copy `.env.example` to `.env` in `mobile/`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Commands

```bash
cd mobile
npm install
npx expo start           # Dev server
npx expo start --android # Android
npx expo start --ios     # iOS
```

### Supabase Configuration

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push                          # Push all 62 migrations
npx supabase functions deploy assign-order    # Edge function
npx supabase functions deploy send-notification
npx supabase gen types typescript --local > mobile/src/types/database.ts
```

## Project Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Start + Android |
| `npm run ios` | Start + iOS |
| `npm run web` | Start + Web |

## Database Overview

22 tables, 9 enums, 62 migrations. Full schema at `supabase/migrations/`.

| Table | Description | Key FK |
|-------|-------------|--------|
| `profiles` | 1:1 with `auth.users`, role-based identity hub | `id → auth.users(id)` |
| `stores` | Store business info, location | `owner_id → profiles` |
| `store_staff` | Additional store users with permissions | `store_id → stores`, `profile_id → profiles` |
| `customers` | Customer records (registered or guest) | `profile_id → profiles` (nullable) |
| `customer_addresses` | Saved delivery addresses | `customer_id → customers` |
| `drivers` | Driver profile, vehicle, bank info | `profile_id → profiles` (unique) |
| `driver_documents` | Document uploads with verification | `driver_id → drivers` |
| `shipment_types` | Lookup: small/medium/large/fragile | Referenced by delivery_orders |
| `delivery_orders` | Central order entity (40+ columns) | store/customer/driver FKs |
| `order_assignments` | Driver assignment per order | `order_id → delivery_orders` |
| `order_status_history` | Audit trail for transitions | `order_id → delivery_orders` |
| `delivery_issues` | Problem reports during delivery | `order_id → delivery_orders` |
| `driver_locations` | GPS time-series during active orders | `driver_id → drivers` |
| `conversations` | One chat per order | `order_id → delivery_orders` (unique) |
| `conversation_participants` | Chat membership | `conversation_id → conversations` |
| `messages` | Chat messages with type + metadata | `conversation_id → conversations` |
| `notifications` | In-app notification records | `profile_id → profiles` |
| `notification_templates` | Bilingual templates | Reference |
| `wallets` | One wallet per profile | `profile_id → profiles` (unique) |
| `wallet_transactions` | All financial transactions | `wallet_id → wallets` |
| `push_tokens` | Device push notification tokens | `profile_id → profiles` |

**Enums:** `user_role`, `order_status` (9 values), `driver_availability`, `assignment_status`, `order_priority`, `document_status`, `payment_method`, `message_type`, `notification_type`, `delivery_issue_type`

## RPC Overview

All SECURITY DEFINER unless noted.

### Order Lifecycle

| RPC | Input | Output | Transition |
|-----|-------|--------|-----------|
| `accept_order` | order_id, driver_id | `{success, assignment_id}` | pending → driver_accepted |
| `arrive_at_store` | order_id, driver_id | `{success}` | driver_accepted → driver_arrived_store |
| `confirm_pickup` | order_id, driver_id, proof_image_url?, notes? | `{success}` | driver_arrived_store → picked_up |
| `start_delivery` | order_id, driver_id | `{success}` | picked_up → on_the_way |
| `arrive_at_destination` | order_id, driver_id | `{success}` | on_the_way → driver_arrived_destination |
| `complete_delivery` | order_id, driver_id, verification_method, verification_data? | `{success, transaction_id, amount}` | → delivered + wallet credit |
| `report_delivery_issue` | order_id, driver_id, issue_type, description? | `{success, issue_id}` | Creates issue record |

### Customer & Address

| RPC | Input | Output |
|-----|-------|--------|
| `get_customer_info` | phone | TABLE(id, full_name) |
| `get_customer_addresses` | customer_id | TABLE(all address columns) |
| `add_customer_address` | customer_id, address_text, lat, lng + optional | JSONB (new address) |
| `ensure_customer_by_phone` | phone, name? | UUID (find or create) |

### Wallet & Chat & Admin

| RPC | Input | Output |
|-----|-------|--------|
| `add_wallet_transaction` | wallet_id, amount, type, reference? | UUID (tx id) |
| `ensure_conversation` | order_id, profile_id, participant_role | UUID (conversation id) |
| `admin_soft_delete_user` | user_id | void |
| `admin_restore_user` | user_id | void |

## Realtime Overview

All subscriptions follow this pattern:

```typescript
const channel = supabase.channel('channel-name')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name', filter: `col=eq.val` }, callback)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'table2' }, callback2)
  .subscribe();
return () => { supabase.removeChannel(channel); };
```

**Publication `supabase_realtime`** includes: `messages`, `conversations`, `conversation_participants`, `delivery_orders` (REPLICA IDENTITY FULL), `drivers` (REPLICA IDENTITY FULL), `notifications` (REPLICA IDENTITY FULL), `wallet_transactions`, `order_status_history`, `driver_locations`.

**Presence channels** used for typing indicators in chat.

## Authentication Flow

1. Sign up → Supabase Auth creates `auth.users` + profile inserted into `profiles`
2. JWT trigger adds `user_role` claim
3. Redirect to login → sign in → `useAuthStore.initialize()` fetches session + profile
4. `useAuthGuard`: missing role record → redirect to setup
5. Setup inserts role record → `refreshProfile()` → navigated to app
6. `trg_create_wallet_on_profile_insert` auto-creates wallet

## Role Permissions

**Driver:** View/accept pending orders, update delivery status via RPCs, read/write own profile, insert GPS, read assigned orders, upload documents, read own wallet, chat in assigned conversations, read notifications.

**Store:** Create/manage own orders, read own store/staff, lookup customers by phone, view/add customer addresses, read own wallet, chat in order conversations, read notifications.

**Customer:** View own orders (by profile/phone), manage addresses, confirm delivery, track driver location, chat in order conversations, read notifications.

**Admin:** Full RLS bypass via `is_admin()`, soft-delete/restore users.

## Current Features

### Completed
- Authentication (sign up, sign in, JWT claims)
- Role-based routing + route guards
- Store dashboard (real-time stats, recent orders)
- Store order creation (6-step flow)
- Store order list (search, filter tabs, pagination, real-time)
- Store order detail (timeline, live tracking, cancel/duplicate/edit)
- Store customer directory
- Store settings + profile management
- Store address editor
- Driver home dashboard (stats, available orders)
- Driver order lifecycle (7 transitions via RPCs)
- Driver wallet (balance, periods, transaction history)
- Driver rewards (achievements with progress bars)
- Driver document upload (license, registration, ID)
- Driver profile, settings, account status
- Driver language (EN/AR) and theme (dark/light/system)
- Driver privacy, help, about screens
- Push notification registration + in-app notification list
- Real-time chat with typing indicators
- Customer order tracking with live map
- Customer address management (CRUD + onboarding)
- Maps with OpenStreetMap tiles (CartoDB)
- 62 database migrations (full schema + RLS + RPCs)
- 2 Edge Functions (assign-order, send-notification)
- Shared design system (colors, spacing, typography, shadows)
- Shared UI components (Button, Card, StatusBadge, etc.)

### In Progress
- Store wallet screen
- Store reports/analytics
- Customer details screen for store
- Order management enhancements (edit flow, bulk actions)

### Planned
- Admin dashboard
- Store earnings/reports
- Customer ratings for drivers
- Driver tipping system
- Scheduled/advanced order options
- Order batching for drivers
- Deep link support
- Offline mode

## Project Status

- **Overall completion:** ~78%
- **Driver module:** 100% (all 23 screens implemented and stable)
- **Store module:** 80% (core screens done, wallet/reports/ratings pending)
- **Customer module:** 90% (address management complete, ratings/tipping pending)
- **Admin module:** 5% (API-level RLS bypass only)
- **Wallet system:** 70% (driver complete, store credit/payout pending)
- **Chat module:** 100%
- **Notifications:** 90% (triggers + in-app complete, Edge Function deployed)
- **Maps:** 95% (OSM migration complete, one iOS double-tile rendering issue)
- **Realtime:** 100%
- **Database schema:** 100% (62 migrations, full RLS, all RPCs)
- **Edge Functions:** 50% (implemented but require deployment)

## Known Limitations

- **iOS map tiles** may render twice due to UrlTile + Apple Maps base layer overlap
- **CartoDB tile availability** dependency (no offline fallback)
- **Customer `[orderId].tsx`** uses direct Supabase update rather than RPC for delivery confirmation
- **Privacy screen** uses local state only (not persisted)
- **Signature capture** in `pickup-confirmation.tsx` is a placeholder (TODO)
- **Store wallet screen** not yet implemented (driver wallet only)
- **No admin dashboard** — admin is API-level only via RLS bypass
- **No deep link support** — all navigation is in-app
- **No offline mode** — 100% online with Supabase
- **Store customer detail screen** not yet built
- **`use-realtime-channel.ts` hook** deprecated (commented out) — all realtime is inline

## Contributing Guidelines

### Branch Strategy
- `main` — production-ready code, passes TypeScript with 0 errors
- `feature/*` — feature branches, merged via PR after review
- `fix/*` — bug fix branches

### Commit Naming
- `feat: description` — new feature
- `fix: description` — bug fix
- `refactor: description` — code refactoring
- `docs: description` — documentation
- `db: description` — database migrations or RPCs
- `chore: description` — maintenance

### Code Style
- TypeScript strict mode with 0 errors
- No console.log in production code
- No commented-out code (except deprecated hooks with notice)
- No hardcoded colors, spacing, font sizes — always use theme tokens via `useColors()`, `spacing.*`, `fontSize.*`
- Import types with `import type`
- All realtime: inline `.channel()` → `.on()` → `.subscribe()`, never after subscribe
- All `router.back()` guarded with `canGoBack()` + fallback

## Coding Standards

### Single Source of Truth
- Supabase is the only source of truth. No mock data, no fake values, no hardcoded coordinates.
- Zustand stores for ephemeral client state only (auth session, create-order flow, settings).
- All financial mutations go through SECURITY DEFINER RPCs.

### Reusable Components
- UI primitives in `src/components/ui/` (Button, Card, StatusBadge, etc.)
- Profile components in `src/components/profile/` shared across all 3 roles
- Store-specific components in `src/components/store/`
- Driver-specific components in `src/components/driver/`
- Never duplicate component implementation across roles

### Reusable Hooks
- All hooks in `src/hooks/` — never recreate the same hook logic in a screen
- Auth-related logic in `use-auth.ts`
- Chat logic in `use-chat.ts`
- Dashboard logic in `store/use-store-dashboard.ts`

### Database First
- Always create SQL migration before writing TypeScript types
- Generate types from Supabase: `supabase gen types typescript --local`
- Never manually write database types that differ from actual schema

### RPC First
- All status transitions → RPC (SECURITY DEFINER)
- Customer/address lookups from store context → RPC (SECURITY DEFINER)
- Wallet mutations → RPC with `SELECT FOR UPDATE`
- Direct table updates from client only when RLS is sufficient and no business logic needed

### Prohibited
- No duplicated code or business logic
- No fake data or mock values
- No Null Island coordinates (0,0)
- No direct inserts into tables with business logic (wallets, orders, addresses from store)
- No `console.log` in production code
- No hardcoded role-specific fallbacks in shared components
- No `router.back()` without `canGoBack()` guard

## License

MIT License — see `mobile/LICENSE`.

