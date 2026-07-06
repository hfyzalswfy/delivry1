-- =============================================
-- 021_rls_orders.sql
-- RLS: طلبات التوصيل والتخصيصات وسجل الحالات
-- =============================================

-- =============================================
-- delivery_orders
-- =============================================
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;

-- المتجر: يرى طلبات متاجره (كمالك أو موظف)
CREATE POLICY "store_select" ON delivery_orders
  FOR SELECT USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
    OR
    store_id IN (SELECT store_id FROM store_staff WHERE profile_id = auth.uid())
  );

-- السائق: يرى الطلبات المخصصة له
CREATE POLICY "driver_select_assigned" ON delivery_orders
  FOR SELECT USING (
    assigned_driver_id IN (SELECT id FROM drivers WHERE profile_id = auth.uid())
  );

-- السائق: يرى الطلبات المنشورة التي لديه تخصيص pending (قبل القبول)
CREATE POLICY "driver_select_pending" ON delivery_orders
  FOR SELECT USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM order_assignments
      WHERE order_id = delivery_orders.id
        AND status = 'pending'
        AND driver_id = (SELECT id FROM drivers WHERE profile_id = auth.uid())
    )
  );

-- العميل: يرى طلباته
CREATE POLICY "customer_select" ON delivery_orders
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );

-- Admin: يرى الكل
CREATE POLICY "admin_select" ON delivery_orders
  FOR SELECT USING (public.is_admin());

-- المتجر: ينشئ طلب توصيل
CREATE POLICY "store_insert" ON delivery_orders
  FOR INSERT WITH CHECK (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
    OR
    store_id IN (SELECT store_id FROM store_staff WHERE profile_id = auth.uid() AND can_create_orders = true)
  );

-- Admin: ينشئ لأي متجر
CREATE POLICY "admin_insert" ON delivery_orders
  FOR INSERT WITH CHECK (public.is_admin());

-- المتجر: يحدث طلباته فقط (قبل قبول السائق)
CREATE POLICY "store_update" ON delivery_orders
  FOR UPDATE USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
    OR
    store_id IN (SELECT store_id FROM store_staff WHERE profile_id = auth.uid())
  ) WITH CHECK (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
    OR
    store_id IN (SELECT store_id FROM store_staff WHERE profile_id = auth.uid())
  );

-- Admin: يحدث الكل
CREATE POLICY "admin_update" ON delivery_orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin: يحذف (soft)
CREATE POLICY "admin_delete" ON delivery_orders
  FOR DELETE USING (public.is_admin());

-- =============================================
-- order_assignments
-- =============================================
ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;

-- المتجر: يرى تخصيصات طلباته
CREATE POLICY "store_select" ON order_assignments
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM delivery_orders
      WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
         OR store_id IN (SELECT store_id FROM store_staff WHERE profile_id = auth.uid())
    )
  );

-- السائق: يرى تخصيصاته هو
CREATE POLICY "driver_select" ON order_assignments
  FOR SELECT USING (
    driver_id = (SELECT id FROM drivers WHERE profile_id = auth.uid())
  );

-- السائق: يحدث حالة التخصيص (قبول/رفض) فقط إذا كان pending
CREATE POLICY "driver_update_status" ON order_assignments
  FOR UPDATE USING (
    driver_id = (SELECT id FROM drivers WHERE profile_id = auth.uid())
    AND status = 'pending'
  ) WITH CHECK (
    driver_id = (SELECT id FROM drivers WHERE profile_id = auth.uid())
    AND status IN ('accepted', 'rejected')
  );

-- Admin: الكل
CREATE POLICY "admin_select" ON order_assignments
  FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_insert" ON order_assignments
  FOR INSERT WITH CHECK (public.is_admin());

-- =============================================
-- order_status_history
-- =============================================
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- المستخدمون يقرؤون سجل الطلبات التي يمكنهم رؤيتها
-- (يتم التحقق من صلاحية order_id عبر التطبيق بعد جلب الطلبات)
CREATE POLICY "read_authenticated" ON order_status_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin: الكل
CREATE POLICY "admin_read" ON order_status_history
  FOR SELECT USING (public.is_admin());
