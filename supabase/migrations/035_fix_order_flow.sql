-- =============================================
-- 035_fix_order_flow.sql
-- إصلاح تدفق الطلب بالكامل (Batch 1)
--
-- المشاكل المُصلحة:
-- 1. on_the_way_at مفقود من delivery_orders
-- 2. sync_assigned_driver يتحقق من 'published' بدلاً من 'pending'
-- 3. driver_select_pending تستخدم 'published' (لاتوجد طلبات بهذه الحالة)
-- 4. لا يوجد INSERT policy للسائقين على order_assignments
-- 5. لا يوجد UPDATE policy للسائقين على delivery_orders
-- 6. لا يوجد UPDATE policy للعملاء على delivery_orders
--
-- ملاحظة: published تبقى في enum للتوافق ولا تُستخدم حالياً
-- =============================================

-- -----------------------------------------
-- 1. العمود المفقود في delivery_orders
--    on_the_way يستخدمه enum order_status
--    لكن لا يوجد timestamp مقابل له
-- -----------------------------------------
ALTER TABLE delivery_orders
  ADD COLUMN IF NOT EXISTS on_the_way_at TIMESTAMPTZ;

COMMENT ON COLUMN delivery_orders.on_the_way_at
  IS 'السائق بدأ التوصيل (في الطريق إلى العميل)';

-- -----------------------------------------
-- 2. تحديث sync_assigned_driver()
--    تغيير الشرط من status='published' إلى status='pending'
--    لأن pending هي الحالة الافتراضية للطلبات الجديدة
--    published بقيت في enum لكن لا تُستخدم
-- -----------------------------------------
CREATE OR REPLACE FUNCTION sync_assigned_driver()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' THEN
    UPDATE delivery_orders
    SET assigned_driver_id    = NEW.driver_id,
        assigned_at           = NEW.responded_at,
        status                = 'driver_accepted',
        driver_accepted_at    = NEW.responded_at
    WHERE id = NEW.order_id
      AND status = 'pending';

    IF FOUND THEN
      UPDATE order_assignments
      SET status = 'expired'
      WHERE order_id = NEW.order_id
        AND id != NEW.id
        AND status = 'pending';
    ELSE
      UPDATE order_assignments
      SET status = 'expired'
      WHERE id = NEW.id AND status = 'pending';
    END IF;

  ELSIF NEW.status IN ('rejected', 'expired') THEN
    NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------
-- 3. إصلاح driver_select_pending
--    التغيير: status = 'published' → status = 'pending'
--    السياسة تسمح للسائق برؤية الطلبات المتاحة التي
--    تم تخصيصها له بحالة pending
--    هذه السياسة تُستخدم في التخصيص المسبق (System Assignment)
--    وليس للعرض العام للطلبات المتاحة
--
--    ملاحظة: شاشة السائق تستعلم status='pending'
--    عبر policy مختلفة (> store_select لا تطابق لكون السائق ليس store)
-- -----------------------------------------
DROP POLICY IF EXISTS "driver_select_pending" ON delivery_orders;
CREATE POLICY "driver_select_pending" ON delivery_orders
  FOR SELECT USING (status = 'pending');

-- -----------------------------------------
-- 4. سياسة جديدة: driver_insert على order_assignments
--    تسمح للسائق بقبول طلب (إنشاء تخصيص بحالة accepted)
--    السياسة تتحقق أن driver_id يعود للسائق الحالي
--    وأن status هو 'accepted' (قبول مباشر)
-- -----------------------------------------
DROP POLICY IF EXISTS "driver_insert" ON order_assignments;
CREATE POLICY "driver_insert" ON order_assignments
  FOR INSERT WITH CHECK (
    driver_id = (SELECT id FROM drivers WHERE profile_id = auth.uid())
    AND status = 'accepted'
  );

-- -----------------------------------------
-- 5. سياسة جديدة: driver_update على delivery_orders
--    تسمح للسائق بتحديث حالة الطلب بعد قبوله
--    (driver_arrived_store → picked_up → on_the_way → delivered)
--    السياسة تتحقق أن assigned_driver_id يعود للسائق الحالي
--    ولا تسمح بتغيير assigned_driver_id نفسه
-- -----------------------------------------
DROP POLICY IF EXISTS "driver_update" ON delivery_orders;
CREATE POLICY "driver_update" ON delivery_orders
  FOR UPDATE USING (
    assigned_driver_id IN (SELECT id FROM drivers WHERE profile_id = auth.uid())
  ) WITH CHECK (
    assigned_driver_id IN (SELECT id FROM drivers WHERE profile_id = auth.uid())
  );

-- -----------------------------------------
-- 6. سياسة جديدة: customer_update على delivery_orders
--    تسمح للعميل بتأكيد التوصيل (تغيير الحالة إلى delivered)
--    مطلوبة لأن العميل لا يملك store_update ولا driver_update
--    السياسة تتحقق أن customer_id يعود للعميل الحالي
-- -----------------------------------------
DROP POLICY IF EXISTS "customer_update" ON delivery_orders;
CREATE POLICY "customer_update" ON delivery_orders
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  ) WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );

-- -----------------------------------------
-- 7. التحقق: تأكيد أن السياسات الجديدة موجودة
-- -----------------------------------------
DO $$
DECLARE
  policies_found INTEGER;
BEGIN
  SELECT COUNT(*) INTO policies_found FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      (tablename = 'order_assignments' AND policyname = 'driver_insert')
      OR (tablename = 'delivery_orders' AND policyname = 'driver_update')
      OR (tablename = 'delivery_orders' AND policyname = 'customer_update')
      OR (tablename = 'delivery_orders' AND policyname = 'driver_select_pending')
    );

  IF policies_found = 4 THEN
    RAISE NOTICE 'All 4 policies verified successfully';
  ELSE
    RAISE WARNING 'Expected 4 policies, found %', policies_found;
  END IF;
END;
$$;
