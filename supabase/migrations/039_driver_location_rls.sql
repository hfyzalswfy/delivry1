-- =============================================
-- 039_driver_location_rls.sql
-- يسمح للعميل والمتجر بقراءة مواقع السائقين
-- المرتبطين بطلباتهم فقط (للتتبع المباشر)
-- =============================================

-- -----------------------------------------
-- 1. العميل يقرأ موقع سائق طلبه
--    الشرط: order_id في طلبات العميل
-- -----------------------------------------
DROP POLICY IF EXISTS "customer_select_driver_location" ON driver_locations;

CREATE POLICY "customer_select_driver_location" ON driver_locations
  FOR SELECT
  USING (
    order_id IN (
      SELECT do_.id
      FROM delivery_orders do_
      WHERE do_.customer_id IN (
        SELECT c.id FROM customers c WHERE c.profile_id = auth.uid()
      )
    )
  );

-- -----------------------------------------
-- 2. المتجر يقرأ موقع سائق طلبه
--    الشرط: order_id في طلبات المتجر
-- -----------------------------------------
DROP POLICY IF EXISTS "store_select_driver_location" ON driver_locations;

CREATE POLICY "store_select_driver_location" ON driver_locations
  FOR SELECT
  USING (
    order_id IN (
      SELECT do_.id
      FROM delivery_orders do_
      WHERE do_.store_id IN (
        SELECT s.id FROM stores s WHERE s.owner_id = auth.uid()
      )
    )
  );

-- =============================================
-- التحقق
-- =============================================
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'driver_locations'
    AND policyname = 'customer_select_driver_location'
  ), 'Policy customer_select_driver_location was not created';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'driver_locations'
    AND policyname = 'store_select_driver_location'
  ), 'Policy store_select_driver_location was not created';
END $$;
