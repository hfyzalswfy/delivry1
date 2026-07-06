-- =============================================
-- 040_ensure_customer_by_phone.sql
-- =============================================
-- 1. دالة SECURITY DEFINER تضمن وجود customer
--    وتُعيد UUID (تنشئ record جديد إذا لم يوجد)
-- 2. تعديل RLS customer_select لإضافة phone fallback
-- 3. تعديل setup لإعادة استخدام customer موجود
-- =============================================

-- -----------------------------------------
-- 1. دالة ensure_customer_by_phone
--    تبحث عن customer بـ phone، وإذا لم يوجد
--    تنشئ record جديد وتُعيد UUID
--    SECURITY DEFINER لتجاوز RLS
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_customer_by_phone(
  p_phone TEXT,
  p_name  TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- البحث عن customer موجود
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE phone = p_phone AND deleted_at IS NULL
  LIMIT 1;

  -- إذا لم يوجد → إنشاء جديد
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (full_name, phone)
    VALUES (COALESCE(p_name, 'Guest'), p_phone)
    RETURNING id INTO v_customer_id;
  END IF;

  -- إذا كان موجوداً واسمه Guest ونمرر name → تحديث
  IF p_name IS NOT NULL THEN
    UPDATE public.customers
    SET full_name = CASE WHEN full_name = 'Guest' THEN p_name ELSE full_name END
    WHERE id = v_customer_id;
  END IF;

  RETURN v_customer_id;
END;
$$;

COMMENT ON FUNCTION public.ensure_customer_by_phone IS
  'تضمن وجود سجل عميل بالهاتف المعطى.
   ترجع UUID (موجود أو جديد).
   إذا كان الاسم "Guest" يتم تحديثه بالاسم الجديد.
   تعمل بـ SECURITY DEFINER لتجاوز RLS.';

-- -----------------------------------------
-- 2. تحديث دالة find_customer_by_phone
--    لتستخدم ensure_customer_by_phone
--    (للتوافق مع الكود القديم)
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.find_customer_by_phone(p_phone TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.customers
  WHERE phone = p_phone AND deleted_at IS NULL
  LIMIT 1;
$$;

-- -----------------------------------------
-- 3. تحديث RLS policy customer_select
--    لإضافة fallback عبر customer_phone
--    حتى لو customer_id NULL أو لم يُربط profile_id
-- -----------------------------------------
DROP POLICY IF EXISTS "customer_select" ON public.delivery_orders;

CREATE POLICY "customer_select" ON public.delivery_orders
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE profile_id = auth.uid())
    OR
    customer_phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
  );

-- -----------------------------------------
-- 4. تحسين: عند ربط profile_id مع customer
--    تحديث الطلبات القديمة تلقائياً
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.link_customer_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ربط الطلبات القديمة التي لها نفس رقم الهاتف
  UPDATE public.delivery_orders
  SET customer_id = NEW.id
  WHERE customer_phone = NEW.phone
    AND customer_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_customer_orders ON public.customers;

CREATE TRIGGER trg_link_customer_orders
  AFTER INSERT OR UPDATE OF profile_id ON public.customers
  FOR EACH ROW
  WHEN (NEW.profile_id IS NOT NULL)
  EXECUTE FUNCTION public.link_customer_orders();

-- -----------------------------------------
-- 5. التحقق
-- -----------------------------------------
DO $$
BEGIN
  -- التحقق من وجود الدالة
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'ensure_customer_by_phone'
      AND n.nspname = 'public'
      AND p.prosecdef = true
  ), 'ensure_customer_by_phone() must be SECURITY DEFINER';

  -- التحقق من وجود RLS policy
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'delivery_orders'
    AND policyname = 'customer_select'
  ), 'customer_select policy must exist after DROP + CREATE';

  -- التحقق من وجود trigger
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_link_customer_orders'
  ), 'trg_link_customer_orders trigger must exist';
END $$;
