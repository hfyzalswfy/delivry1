-- =============================================
-- 037_driver_select_assigned.sql
-- يسمح للسائق بقراءة الطلبات التي تم تعيينه لها
-- ضروري لـ Realtime Subscriptions بعد قبول الطلب
-- =============================================

DROP POLICY IF EXISTS "driver_select_assigned" ON delivery_orders;

CREATE POLICY "driver_select_assigned" ON delivery_orders
  FOR SELECT TO authenticated
  USING (assigned_driver_id IN (SELECT id FROM drivers WHERE profile_id = auth.uid()));

-- =============================================
-- التحقق
-- =============================================
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'delivery_orders' 
    AND policyname = 'driver_select_assigned'
  ), 'Policy driver_select_assigned was not created';
END $$;
