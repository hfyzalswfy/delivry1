# Database Architecture Roadmap — Delivery Platform

> **Project:** Delivery Management Platform (Supabase + PostgreSQL + React Native)
> **Last Updated:** 2026-06-11
> **Status:** Phase 2C Complete (All migrations + RLS approved)

---

## Migration Files (in order)

|  #  | File                                  | Entity                                       | Description                                                                                                                                                                                                                                                                                                        |
| :-: | ------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 001 | `001_enums.sql`                       | —                                            | 7 custom enum types (`user_role`, `order_status`, `driver_availability`, `assignment_status`, `order_priority`, `document_status`, `payment_method`)                                                                                                                                                               |
| 002 | `002_base_functions.sql`              | —                                            | `update_updated_at()` trigger function, `order_number_seq` sequence, `generate_order_number()` function                                                                                                                                                                                                            |
| 003 | `003_profiles.sql`                    | `profiles`                                   | All registered users (maps to `auth.users`). Roles: customer, driver, store, admin. Soft-delete support.                                                                                                                                                                                                           |
| 004 | `004_stores.sql`                      | `stores`, `store_staff`                      | Stores and their authorized staff. `owner_id` links to profiles. Staff have `can_create_orders` / `can_view_reports` permissions.                                                                                                                                                                                  |
| 005 | `005_customers.sql`                   | `customers`, `customer_addresses`            | Delivery recipients (separate from auth for unregistered customers). Each customer can have multiple addresses.                                                                                                                                                                                                    |
| 006 | `006_drivers.sql`                     | `drivers`, `driver_documents`                | Drivers with availability status, last known location, ratings, vehicle info, and bank account. Documents for identity & license verification.                                                                                                                                                                     |
| 007 | `007_shipment_types.sql`              | `shipment_types`                             | Lookup table: small, medium, large, fragile. No updated_at/deleted_at.                                                                                                                                                                                                                                             |
| 008 | `008_delivery_orders.sql`             | **`delivery_orders`**                        | **Core table.** 40 columns covering: relationships, customer data (denormalized), pickup/delivery addresses, shipment details (`CHECK` weight), financial data (4 `CHECK` constraints), lifecycle (status, priority, assigned driver), proof of delivery (OTP), status timestamps, soft-delete. 6 partial indexes. |
| 009 | `009_order_assignments.sql`           | `order_assignments`, `order_status_history`  | Assignment attempts per driver + status change audit log. `sync_assigned_driver()` trigger prevents double-assignment via `WHERE status = 'published'`.                                                                                                                                                            |
| 010 | `010_seed_data.sql`                   | —                                            | 4 shipment types (small, medium, large, fragile). Idempotent (`ON CONFLICT DO NOTHING`).                                                                                                                                                                                                                           |
| 011 | `011_driver_locations.sql`            | **`driver_locations`**                       | GPS tracking time-series table. Every location point creates a new row. `driver_id` + `order_id` + coordinates + accuracy + `recorded_at`. `AFTER INSERT` trigger updates `drivers.current_latitude/longitude`. 3 partial indexes with `FILLFACTOR = 80`.                                                          |
| 012 | `012_conversations.sql`               | `conversations`, `conversation_participants` | Chat system: one conversation per order (1:1). Participants linked to profiles with role (`user_role`). `UNIQUE(conversation_id, profile_id)`.                                                                                                                                                                     |
| 013 | `013_messages.sql`                    | **`messages`**                               | Message content with `message_type` ENUM (7 types). `metadata JSONB` for per-type extras (duration, dimensions, file info, coordinates). 2 indexes.                                                                                                                                                                |
| 014 | `014_notifications.sql`               | `notifications`                              | In-app notification center. `read_at` instead of `is_read`. `notification_type` ENUM (6 types). `data JSONB` for linking to entities. 2 indexes (including unread count partial index).                                                                                                                            |
| 015 | `015_wallets.sql`                     | `wallets`                                    | One wallet per profile. `DECIMAL(12,2)` balance, currency, `is_frozen` flag.                                                                                                                                                                                                                                       |
| 016 | `016_wallet_transactions.sql`         | `wallet_transactions`                        | Financial transaction log. **`add_wallet_transaction()` function** with `SELECT FOR UPDATE` for ACID compliance (row lock prevents race conditions).                                                                                                                                                               |
| 017 | `017_push_tokens.sql`                 | `push_tokens`                                | Expo/FCM push tokens per device. `UNIQUE(token)` with `ON CONFLICT DO UPDATE` pattern.                                                                                                                                                                                                                             |
| 018 | `018_seed_notification_templates.sql` | `notification_templates`                     | 6 notification templates (Arabic + English) for Edge Functions to generate standardized push messages.                                                                                                                                                                                                             |
| 019 | `019_rls_reference.sql`               | —                                            | `public.is_admin()` + `public.user_role()` helper functions (JWT-based). RLS for `shipment_types` and `notification_templates` (read all, write admin).                                                                                                                                                            |
| 020 | `020_rls_profiles.sql`                | —                                            | RLS for `profiles`, `stores`, `store_staff`, `customers`, `customer_addresses`, `drivers`, `driver_documents`. Each user reads/updates own; admin reads/updates all.                                                                                                                                               |
| 021 | `021_rls_orders.sql`                  | —                                            | RLS for `delivery_orders` (store/driver/customer/admin access), `order_assignments` (driver updates status pending→accepted/rejected), `order_status_history` (authenticated read).                                                                                                                                |
| 022 | `022_rls_tracking.sql`                | —                                            | RLS for `driver_locations`: driver reads/inserts own; admin reads all.                                                                                                                                                                                                                                             |
| 023 | `023_rls_chat.sql`                    | —                                            | RLS for `conversations`, `conversation_participants`, `messages`: participants only see their conversations. Sender membership validated on INSERT via RLS.                                                                                                                                                        |
| 024 | `024_rls_notifications.sql`           | —                                            | RLS for `notifications` (user reads own + updates read_at; admin reads all) and `push_tokens` (user manages own; admin reads all).                                                                                                                                                                                 |
| 025 | `025_rls_wallets.sql`                 | —                                            | RLS for `wallets` and `wallet_transactions`: user reads own; admin reads all. No direct INSERT/UPDATE (handled by SECURITY DEFINER function).                                                                                                                                                                      |
| 026 | `026_rls_admin_bypass.sql`            | —                                            | SECURITY DEFINER rewrites: `add_wallet_transaction()` bypasses RLS. Helper functions: `admin_soft_delete_user()`, `admin_restore_user()`.                                                                                                                                                                          |

---

## Entity Relationship Summary

```
auth.users
    └── profiles (003)
           ├── stores (004) ←── store_staff (004)
           ├── customers (005) ←── customer_addresses (005)
           ├── drivers (006) ←── driver_documents (006)
           │                ←── driver_locations (011)
           ├── wallets (015) ←── wallet_transactions (016)
           ├── push_tokens (017)
           └── [participant] ←── conversation_participants (012)
                                    └── conversations (012) ←── messages (013)

delivery_orders (008) ←── order_assignments (009)
                     ←── order_status_history (009)
                     ←── conversations (012) ←── messages (013)
                     ←── driver_locations (011)

notifications (014) → profiles
notification_templates (018) → metadata only
```

---

## Key Design Decisions

### Security & RLS

- **RLS Policies applied** across all 18 data tables (migrations 019–026)
- **`public.is_admin()`** — centralized JWT-based admin check (no subqueries, 100x faster than `IN (SELECT ...)`)
- **`public.user_role()`** — returns user role from JWT claims
- **Principle of Least Privilege**: each role sees only its own data
- **Driver can see pending published orders** via `order_assignments` BEFORE accepting
- **Chat membership enforced via RLS**: `messages` INSERT verifies sender is `conversation_participants`
- **Wallet transactions protected**: `add_wallet_transaction()` is SECURITY DEFINER (bypasses RLS on wallets)
- **Soft delete** (`deleted_at`) used across all major tables
- **No trigger-based RLS bypass** — all security is declarative RLS policies

### ACID Compliance (Wallets)

- `add_wallet_transaction()` uses `SELECT FOR UPDATE` to prevent race conditions
- Balance = `SUM(wallet_transactions.amount)` — always consistent
- SQL function (not trigger, not edge function) chosen for atomicity

### Chat System

- `message_type` ENUM supports 7 types from day one (text, image, voice, video, file, location, system)
- `metadata JSONB` avoids premature normalization (no separate `message_attachments` table in v1)
- `sender_id` membership validated via RLS, not FK constraint

### GPS Tracking

- Time-series table (no updates, no soft deletes)
- `AFTER INSERT` trigger updates `drivers.current_lat/lng` with `recorded_at >=` guard
- 90-day retention policy (documented; batched DELETE, no partitioning yet)
- `FILLFACTOR = 80` on the driver index to handle continuous inserts

### Performance Indexes

- All indexes are partial or covering where possible
- Every index serves a specific query pattern (no over-indexing)
- `DESC` on `created_at` indexes for LIMIT queries

---

## RLS Policy Matrix (by Role)

| Table                    |    Customer     |         Driver         |      Store      |  Admin  | Notes                                  |
| ------------------------ | :-------------: | :--------------------: | :-------------: | :-----: | -------------------------------------- |
| `profiles`               |     🟢 Own      |         🟢 Own         |     🟢 Own      | 🟢 All  | UPDATE own only; INSERT via Auth       |
| `stores`                 |       ⚪        |           ⚪           | 🟢 Own + Staff  | 🟢 All  |                                        |
| `store_staff`            |       ⚪        |           ⚪           | 🟢 Own + Owner  | 🟢 All  | Owner manages staff                    |
| `customers`              |    🟢 Own\*     |           ⚪           |  🟢 Via orders  | 🟢 All  | \*if registered                        |
| `customer_addresses`     |     🟢 Own      |           ⚪           |       ⚪        | 🟢 All  |                                        |
| `drivers`                |       ⚪        |         🟢 Own         |       ⚪        | 🟢 All  |                                        |
| `driver_documents`       |       ⚪        |      🟢 Read own       |       ⚪        | 🟢 All  | Admin approves                         |
| `delivery_orders`        |     🟢 Own      | 🟢 Assigned + Pending  |   🟢 Store's    | 🟢 All  | Driver sees pending before accept      |
| `order_assignments`      |       ⚪        | 🟢 Own + Update status |  🟢 Via orders  | 🟢 All  | Driver: only pending→accepted/rejected |
| `order_status_history`   |   🟢 Via app    |       🟢 Via app       |   🟢 Via app    | 🟢 All  | App validates order_id                 |
| `driver_locations`       |       ⚪        |      🟢 Own (R+W)      |       ⚪        | 🟢 All  | No DELETE                              |
| `conversations`          | 🟢 Participates |    🟢 Participates     | 🟢 Participates | 🟢 All  |                                        |
| `messages`               | 🟢 Participates |    🟢 Participates     | 🟢 Participates | 🟢 All  | INSERT checks membership via RLS       |
| `notifications`          |  🟢 Own (R+U)   |      🟢 Own (R+U)      |  🟢 Own (R+U)   | 🟢 All  | UPDATE only read_at                    |
| `push_tokens`            |  🟢 Own (ALL)   |      🟢 Own (ALL)      |  🟢 Own (ALL)   | 🟢 Read | INSERT via app                         |
| `wallets`                |       ⚪        |         🟢 Own         |     🟢 Own      | 🟢 All  | No direct INSERT/UPDATE                |
| `wallet_transactions`    |       ⚪        |         🟢 Own         |     🟢 Own      | 🟢 All  | INSERT via SECURITY DEFINER            |
| `shipment_types`         |     🟢 Read     |        🟢 Read         |     🟢 Read     | 🟢 All  | Reference table                        |
| `notification_templates` |     🟢 Read     |        🟢 Read         |     🟢 Read     | 🟢 All  | Reference table                        |

🟢 = Access granted | ⚪ = No access

---

## Planned Phases

| Phase | Status      | Description                                                                            |
| ----- | ----------- | -------------------------------------------------------------------------------------- |
| 2A    | ✅ Complete | Core tables: profiles, stores, customers, drivers, orders, assignments, shipment types |
| 2B    | ✅ Complete | GPS tracking, chat, notifications, wallets, push tokens, notification templates        |
| 2C    | ✅ Complete | **RLS Policies** — Row Level Security for all tables (8 migration files: 019–026)      |
| 3     | 🔲 Pending  | Edge Functions & Application Layer (React Native + Supabase)                           |
