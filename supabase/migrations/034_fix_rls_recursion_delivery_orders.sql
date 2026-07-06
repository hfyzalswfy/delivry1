-- =============================================
-- 034_fix_rls_recursion_delivery_orders.sql
-- إصلاح: infinite recursion in policy for relation "delivery_orders"
--
-- تم تحديد دورتين RLS (بعد التحقق من pg_policies):
--
-- الدورة 1: delivery_orders ↔ customers
--   delivery_orders.customer_select → queries customers
--     customers.read_store → queries delivery_orders ← RECURSION
--
-- الدورة 2: delivery_orders ↔ order_assignments
--   delivery_orders.driver_select_pending → queries order_assignments
--     order_assignments.store_select → queries delivery_orders ← RECURSION
--
-- الحل: SECURITY DEFINER functions لكسر الحلقة
--   (نفس نهج 030_fix_rls_recursion_stores.sql)
-- =============================================

-- -----------------------------------------
-- 1. دالة مساعدة: هل يمكن للمستخدم الوصول لبيانات عميل معين؟
--    تستخدمها سياسة customers.read_store
--    تعمل بـ SECURITY DEFINER لتجنب إعادة تفعيل RLS على delivery_orders
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_customer(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM delivery_orders
    WHERE customer_id = p_customer_id
      AND store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );
$$;

-- -----------------------------------------
-- 2. دالة مساعدة: هل يمكن للمستخدم رؤية تخصيص طلب معين؟
--    تستخدمها سياسة order_assignments.store_select
--    تعمل بـ SECURITY DEFINER لتجنب إعادة تفعيل RLS على delivery_orders
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_order_assignment(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM delivery_orders
    WHERE id = p_order_id
      AND (
        store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
        OR
        store_id IN (SELECT store_id FROM store_staff WHERE profile_id = auth.uid())
      )
  );
$$;

-- -----------------------------------------
-- 3. إصلاح سياسة customers.read_store
--    تستخدم الدالة بدلاً من الاستعلام المباشر
-- -----------------------------------------
DROP POLICY IF EXISTS "read_store" ON customers;
CREATE POLICY "read_store" ON customers
  FOR SELECT USING (public.can_access_customer(id));

-- -----------------------------------------
-- 4. إصلاح سياسة order_assignments.store_select
--    تستخدم الدالة بدلاً من الاستعلام المباشر
-- -----------------------------------------
DROP POLICY IF EXISTS "store_select" ON order_assignments;
CREATE POLICY "store_select" ON order_assignments
  FOR SELECT USING (public.can_access_order_assignment(order_id));

-- -----------------------------------------
-- 5. تحقق: تأكيد أن الدوال تعمل بـ SECURITY DEFINER
-- -----------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname IN ('can_access_customer', 'can_access_order_assignment')
      AND n.nspname = 'public'
      AND p.prosecdef = true
    HAVING COUNT(*) = 2
  ) THEN
    RAISE NOTICE 'Both functions are SECURITY DEFINER (verified)';
  ELSE
    RAISE WARNING 'One or both functions are not SECURITY DEFINER - check migration';
  END IF;
END;
$$;
