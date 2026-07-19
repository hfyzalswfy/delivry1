# Developer Onboarding Guide

## First Steps

### 1. Read these files first (in order)

1. **`README.md`** — Project overview, tech stack, folder structure
2. **`docs/ARCHITECTURE.md`** — Complete architecture documentation
3. **`docs/PROJECT_GUIDE_AR.md`** — Arabic technical guide (critical decisions explained)
4. **`docs/PROJECT_STATUS.md`** — Current progress, known issues, what remains
5. **`supabase/migrations/001_enums.sql`** — Understand all enum types
6. **`supabase/migrations/008_delivery_orders.sql`** — Central table schema
7. **`mobile/src/types/database.ts`** — TypeScript types matching the database
8. **`mobile/src/components/ui/Button.tsx`** — Example of shared component pattern
9. **`mobile/app/(store)/create-order/index.tsx`** — Example screen (create-order flow start)
10. **`mobile/src/store/create-order-store.ts`** — Example Zustand store

### 2. Set up the environment

```bash
# Prerequisites
node --version   # >= 18
npm --version    # >= 9

# Clone and install
cd mobile
cp .env.example .env   # Add your Supabase credentials
npm install

# Start development
npx expo start

# In another terminal, link Supabase
cd ..
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### 3. Verify everything works

```bash
cd mobile
npx tsc --noEmit   # Must output 0 errors
npx expo start     # Must open without crash
```

---

## What to Never Change

### NEVER modify these without explicit approval:

1. **Database migrations** — Never modify an existing migration file. Always create a new one (sequentially numbered).
2. **Supabase types** — Never manually edit `src/types/database.ts`. Regenerate with `supabase gen types typescript --local`.
3. **Existing RPC signatures** — Never change input/output of deployed RPCs. Create new versions if needed.
4. **Auth flow** — The `useAuthStore.initialize()` + `useAuthGuard()` pattern. Never change auth routing logic.
5. **Realtime pattern** — Must always be `.channel()` → `.on()` → `.subscribe()` with proper cleanup.
6. **Store Zustand stores** — Existing actions and state shape are fixed. Add new actions but don't rename/remove existing ones.
7. **Shared components** — Don't change component props or behavior in `src/components/ui/`, `src/components/profile/`. Extend with new components.
8. **Design tokens** — Don't change `src/theme/colors.ts`, `spacing.ts` values. They're the single source of truth.
9. **i18n keys** — Don't change existing translation keys. Add new keys following the same patterns.
10. **Driver module screens** — Don't touch any file under `(driver)/` unless fixing a confirmed driver bug.

---

## Architecture Rules

### Rule 1: Database First
Always create a SQL migration before writing TypeScript code that depends on new tables/columns. Migrations are numbered sequentially (062, 063, ...). Never modify a past migration.

### Rule 2: RPC First
Any multi-step database operation must be a SECURITY DEFINER RPC:
- Order status transitions → RPC
- Wallet transactions → RPC
- Address creation from store context → RPC
- Customer lookup → RPC

### Rule 3: No Direct Inserts
Never directly INSERT into `wallets`, `wallet_transactions`, `delivery_orders` (for status transitions), or `customer_addresses` (from store context). Use RPCs.

### Rule 4: Single Source of Truth
- Supabase is the only database source of truth
- Zustand is for ephemeral client state only
- Never cache or duplicate database state in stores
- Never use mock data or hardcoded values

### Rule 5: No Dead Code
- No commented-out code (except deprecated hooks with a deprecation notice)
- No console.log in production
- No unused imports or variables
- TypeScript 0 errors is mandatory

### Rule 6: Theme Tokens Only
Never hardcode colors, spacing, font sizes, or border radii. Always use:
```typescript
const colors = useColors();       // colors.primary, colors.text, etc.
const spacing = require('...');   // spacing.sm, spacing.md, etc.
const fontSize = require('...');  // fontSize.sm, fontSize.md, etc.
```

### Rule 7: Role Isolation
When working on one role module, do NOT modify files in other role modules unless fixing a cross-cutting bug.
- Store work → only `(store)/`, `(chat)/`, `(notifications)/`, `src/components/store/`, shared components
- Driver work → only `(driver)/`, `(chat)/`, `(notifications)/`, `src/components/driver/`, shared components

### Rule 8: Navigation Safety
Every `router.back()` must be guarded:
```typescript
if (router.canGoBack()) router.back();
else router.replace('/(app)/(store)');  // role-specific fallback
```

---

## How to Build a New Feature

### Step 1: Plan the database changes
```bash
# Create migration
touch supabase/migrations/063_your_feature_name.sql
```

Write SQL: table changes, RPCs, RLS policies, triggers.

### Step 2: Generate TypeScript types
```bash
cd mobile
npx supabase gen types typescript --local > src/types/database.ts
```

### Step 3: Create or extend Zustand store (if needed)
Only if the feature needs ephemeral multi-step state (like create-order flow).

### Step 4: Create shared components (if reusable)
Place in `src/components/`:
- `src/components/ui/` for generic UI (Button, Card, etc.)
- `src/components/profile/` for profile-related
- `src/components/store/` or `src/components/driver/` for role-specific

### Step 5: Create hooks (if reusable)
Place in `src/hooks/`. Only if the logic is complex and potentially reusable across screens.

### Step 6: Create screens
Place in the appropriate `app/` role directory:
- `app/(app)/(store)/` for store screens
- `app/(app)/(driver)/` for driver screens
- `app/(app)/(customer)/` for customer screens

### Step 7: Update layout
If adding a new route, update the role's `_layout.tsx`:
- Visible tabs → add to tab list
- Hidden screens → add with `href: null`

### Step 8: Verify
```bash
npx tsc --noEmit   # 0 errors
npx expo start     # Manual testing
```

---

## How to Reuse Components

### Existing Component Categories

**UI Primitives** (`src/components/ui/`):
- `Button` — Primary, secondary, danger, outline, ghost, success, warning variants
- `Card` / `CardRow` / `CardDivider` — Container components
- `StatusBadge` — Order status pill with color mapping
- `Avatar` — Circular avatar with initial fallback and role color
- `EmptyState` — Centered icon + title + subtitle
- `LoadingScreen` — Centered spinner
- `ScreenLayout` — Scrollable wrapper with pull-to-refresh
- `SettingsRow` — Label + value/toggle/chevron
- `TabIcon` — Tab bar icon
- `SharedMap` — Map with theme-aware tiles

**Profile** (`src/components/profile/`):
- `ProfileHeader` — Avatar + name + role + phone
- `ProfileStatsRow` — Horizontal stat cards
- `ProfileCard` / `ProfileInfoRow` — Info card with label/value pairs
- `ProfileMenuSection` — Menu items list with icons
- `ProfileSignOut` — Sign out button with confirmation

**Address** (`src/components/`):
- `AddressCard` — Single address display with actions
- `AddressList` — Scrollable address list
- `AddressForm` — Address input form
- `LocationPickerScreen` — Full-screen map picker

**Order** (`src/components/`):
- `OrderReviewCard` — Read-only order summary
- `OrderDetailForm` — Order detail input form

**Chat** (`src/components/`):
- `ConversationsScreen` — Conversation list (shared across roles)

### Usage Pattern

```typescript
// Import shared components
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { useColors } from '../../../src/theme/ThemeProvider';

// Use theme tokens
const colors = useColors();

// Render
<Card>
  <Button title="Save" variant="primary" onPress={handleSave} />
</Card>
```

---

## How to Reuse Hooks

### Existing Hooks (in `src/hooks/`)

| Hook | Purpose | Returns |
|------|---------|---------|
| `useAuthGuard()` | Route guard | Side effect only |
| `useConversation(orderId)` | Real-time chat | `{ conversationId, messages, loading, sending, typingUsers, sendMessage, setTyping, handleInputChange }` |
| `useConversations()` | All conversations | `{ conversations, loading }` |
| `useDriverLocation(orderId)` | GPS tracking | Side effect only |
| `useDriverOrders()` | Driver's orders | `{ activeOrders, completedOrders, cancelledOrders, loading, refresh }` |
| `useDriverProfile()` | Driver record | `{ driver, driverId, loading }` |
| `useNotificationsList()` | Notification feed | `{ notifications, unreadCount, loading, markAsRead }` |
| `useOrderGuard(orderId, expectedStatuses, channelName?)` | Route guard for order status | `{ allowed, loading, error, order, driverId }` |
| `usePushToken()` | Push registration | Side effect only |

### Creating New Hooks

Only create a hook if:
1. The logic is complex (multiple state variables, effects, subscriptions)
2. The logic might be reused across multiple screens
3. The logic involves Supabase queries + realtime

Place in `src/hooks/` for general hooks, `src/hooks/store/` for store-specific hooks.

---

## How to Work with Supabase

### Client Setup
The typed Supabase client is in `src/lib/supabase.ts`:
```typescript
import { supabase } from '../../../src/lib/supabase';
```

### Query Pattern
```typescript
// Simple select
const { data } = await supabase.from('stores').select('id').eq('owner_id', profile.id).single();

// RPC call
const { data, error } = await supabase.rpc('add_customer_address', { p_customer_id: id, ... });

// Realtime subscription
const channel = supabase.channel('name')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_orders', filter: `store_id=eq.${storeId}` }, (payload) => {
    // handle change
  })
  .subscribe();

// Cleanup in useEffect return
return () => { supabase.removeChannel(channel); };
```

### Important: RPC vs Direct Table Access

| Operation | Method | Reason |
|-----------|--------|--------|
| Read store's orders | Direct table select | RLS is sufficient |
| Change order status | RPC | Needs business logic + audit trail |
| Add wallet transaction | RPC | Needs SELECT FOR UPDATE |
| Lookup customer by phone | RPC | Bypasses RLS for store context |
| Create customer address (from store) | RPC | Store doesn't own customer record |
| Read customer addresses | RPC | More efficient query with ordering |

---

## How to Create Migrations

### Naming Convention
```
###_descriptive_name.sql
```
Where `###` is the next sequential number.

### Structure
```sql
-- 063_your_feature.sql

-- Step 1: Enums (if needed)
-- ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'new_status';

-- Step 2: Table changes
-- ALTER TABLE table_name ADD COLUMN column_name TYPE;

-- Step 3: Indexes
-- CREATE INDEX idx_new ON table_name (column);

-- Step 4: Functions/RPCs
-- CREATE OR REPLACE FUNCTION function_name()

-- Step 5: Triggers
-- CREATE TRIGGER trigger_name

-- Step 6: RLS Policies
-- CREATE POLICY policy_name ON table_name FOR OPERATION TO role USING (condition);

-- Step 7: Grants
-- GRANT EXECUTE ON FUNCTION function_name TO authenticated;
```

### Rules
- Never modify an existing migration
- Every migration must be idempotent (IF NOT EXISTS, OR REPLACE)
- Test with `supabase db push` before committing
- Generate TypeScript types after migration: `supabase gen types typescript --local`

---

## How to Create RPCs

### Pattern
```sql
CREATE OR REPLACE FUNCTION function_name(
  p_param1 UUID,
  p_param2 TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_user_id UUID;
BEGIN
  -- Verify caller authorization
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Business logic
  -- ... (SELECT/INSERT/UPDATE with validation)

  -- Return result
  RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION function_name TO authenticated;
```

### Rules
1. Always SECURITY DEFINER for business logic RPCs
2. Verify `auth.uid()` at the start
3. Return JSONB with `{ success: boolean, error?: string }`
4. Use `SELECT ... FOR UPDATE` for wallet/financial operations
5. Grant EXECUTE to `authenticated` role (not `anon`)

---

## How to Test

### Before pushing any code:

1. **TypeScript check**: `npx tsc --noEmit` — must be 0 errors
2. **Check Supabase client calls**: Verify RPC names match database functions
3. **Verify realtime pattern**: `.channel()` → all `.on()` → `.subscribe()`
4. **Check navigation**: All `router.back()` must have `canGoBack()` guard
5. **Check RLS**: Test that unauthenticated/unauthorized users can't access restricted data
6. **Check imports**: No unused imports, no circular dependencies

### Feature-specific testing:

**Order flow test:**
1. Create an order from store
2. Verify it appears in available orders for drivers
3. Accept as driver
4. Progress through all statuses to delivered
5. Verify wallet was credited

**Address flow test:**
1. Enter phone number → should find existing customer or prompt for name
2. If customer found → addresses should load
3. Add new address → should return to select screen → auto-select
4. New customer → should show location picker

**Wallet test:**
1. Complete a delivery
2. Verify `wallet_transactions` has a new credit entry
3. Verify driver's wallet balance increased

---

## How to Avoid Breaking the Project

### Golden Rules:

1. **Never modify existing migrations** — always create new ones
2. **Never delete columns or tables** without confirming no code references them
3. **Never rename RPCs** — create new ones and deprecate old ones
4. **Never remove imports** without checking they're unused
5. **Never change shared component props** — extend with optional new props
6. **Never modify driver screens** when working on store features
7. **Never hardcode role paths** in shared components
8. **Never use `router.back()` without `canGoBack()`**
9. **Never add `.on()` after `.subscribe()`** on realtime channels
10. **Never commit with TypeScript errors**

### Pre-commit Checklist:
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] No `console.log` or debug code
- [ ] No fake data, mock values, or hardcoded coordinates
- [ ] All new UI uses theme tokens (useColors, spacing, fontSize)
- [ ] All new screens use shared components where possible
- [ ] No modifications to files outside the feature scope
- [ ] SQL migrations are additive only (no breaking changes)
- [ ] RPCs are SECURITY DEFINER with proper auth checks
- [ ] Realtime subscriptions follow the correct pattern
- [ ] Router navigation has proper guards

### Rollback Plan:
```bash
# Revert database changes
npx supabase migration down

# Revert code changes
git checkout -- path/to/file

# If migration was already applied to production
# Create a new migration that reverses the changes
```
