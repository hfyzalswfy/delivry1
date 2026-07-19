-- =============================================
-- 060_customer_lookup_rpc.sql
-- SECURITY DEFINER functions for store-side
-- customer lookup during order creation.
-- Bypasses RLS so stores can find registered
-- customers who have zero existing orders.
-- =============================================

-- -----------------------------------------
-- 1. get_customer_info(p_phone)
-- Returns {id, full_name} or empty set.
-- SECURITY DEFINER to bypass RLS.
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.get_customer_info(p_phone TEXT)
RETURNS TABLE(id UUID, full_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.full_name
  FROM public.customers c
  WHERE c.phone = p_phone
    AND c.deleted_at IS NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_customer_info IS
  'تبحث عن عميل مسجل برقم الهاتف.
   ترجع id و full_name إذا وُجد.
   تعمل بـ SECURITY DEFINER لتجاوز RLS.';

-- -----------------------------------------
-- 2. get_customer_addresses(p_customer_id)
-- Returns all non-deleted addresses for a
-- customer, default-first.
-- SECURITY DEFINER to bypass RLS.
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.get_customer_addresses(p_customer_id UUID)
RETURNS TABLE(
  id UUID,
  customer_id UUID,
  label TEXT,
  address_text TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  apartment TEXT,
  floor TEXT,
  landmark TEXT,
  notes TEXT,
  is_default BOOLEAN,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ca.id, ca.customer_id, ca.label, ca.address_text, ca.latitude, ca.longitude, ca.apartment, ca.floor, ca.landmark, ca.notes, ca.is_default, ca.deleted_at, ca.created_at, ca.updated_at
  FROM public.customer_addresses ca
  WHERE ca.customer_id = p_customer_id
    AND ca.deleted_at IS NULL
  ORDER BY ca.is_default DESC, ca.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_customer_addresses IS
  'ترجع جميع عناوين العميل (غير المحذوفة).
   تعمل بـ SECURITY DEFINER لتجاوز RLS.';

-- -----------------------------------------
-- 3. store_insert policy on customer_addresses
-- Allows store owners/staff to add addresses
-- for customers during order creation.
-- -----------------------------------------
CREATE POLICY "store_insert" ON customer_addresses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM store_staff WHERE profile_id = auth.uid())
  );

-- -----------------------------------------
-- 4. Verification
-- -----------------------------------------
DO $$
BEGIN
  -- Verify get_customer_info exists and is SECURITY DEFINER
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'get_customer_info'
      AND n.nspname = 'public'
      AND p.prosecdef = true
  ), 'get_customer_info() must exist and be SECURITY DEFINER';

  -- Verify get_customer_addresses exists and is SECURITY DEFINER
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'get_customer_addresses'
      AND n.nspname = 'public'
      AND p.prosecdef = true
  ), 'get_customer_addresses() must exist and be SECURITY DEFINER';

  RAISE NOTICE 'Migration 060 applied successfully';
END $$;
