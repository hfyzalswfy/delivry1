-- =============================================
-- 020_rls_profiles.sql
-- RLS: الملفات الشخصية والمتاجر والعملاء والسائقين
-- =============================================

-- =============================================
-- profiles
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- المستخدم يقرأ ملفه الشخصي فقط
CREATE POLICY "read_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admin يقرأ الكل
CREATE POLICY "admin_read_all" ON profiles
  FOR SELECT USING (public.is_admin());

-- المستخدم يحدث ملفه الشخصي فقط (لا يغير الدور)
CREATE POLICY "update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin يحدث أي ملف
CREATE POLICY "admin_update" ON profiles
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- stores
-- =============================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- مالك المتجر يقرأ متجره
CREATE POLICY "read_own" ON stores
  FOR SELECT USING (owner_id = auth.uid());

-- موظفو المتجر يقرؤون متجرهم
CREATE POLICY "read_staff" ON stores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM store_staff
      WHERE store_id = stores.id
        AND profile_id = auth.uid()
    )
  );

-- Admin يقرأ الكل
CREATE POLICY "admin_read_all" ON stores
  FOR SELECT USING (public.is_admin());

-- مالك المتجر يحدث متجره
CREATE POLICY "update_own" ON stores
  FOR UPDATE USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Admin يحدث أي متجر
CREATE POLICY "admin_update" ON stores
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin فقط ينشئ ويحذف
CREATE POLICY "admin_insert" ON stores
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "admin_delete" ON stores
  FOR DELETE USING (public.is_admin());

-- =============================================
-- store_staff
-- =============================================
ALTER TABLE store_staff ENABLE ROW LEVEL SECURITY;

-- الموظف يرى سجله فقط
CREATE POLICY "read_own" ON store_staff
  FOR SELECT USING (profile_id = auth.uid());

-- مالك المتجر يرى جميع موظفيه
CREATE POLICY "read_store_owner" ON store_staff
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_staff.store_id
        AND stores.owner_id = auth.uid()
    )
  );

-- Admin يقرأ الكل
CREATE POLICY "admin_read_all" ON store_staff
  FOR SELECT USING (public.is_admin());

-- مالك المتجر يدير الموظفين
CREATE POLICY "owner_insert" ON store_staff
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_staff.store_id
        AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "owner_delete" ON store_staff
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_staff.store_id
        AND stores.owner_id = auth.uid()
    )
  );

-- Admin يدير الكل
CREATE POLICY "admin_all" ON store_staff
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- customers
-- =============================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- العميل المسجل يقرأ سجله
CREATE POLICY "read_own" ON customers
  FOR SELECT USING (profile_id = auth.uid());

-- المتجر يقرأ عملاءه (الذين لهم طلبات عنده)
CREATE POLICY "read_store" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM delivery_orders
      WHERE delivery_orders.customer_id = customers.id
        AND delivery_orders.store_id IN (
          SELECT id FROM stores WHERE owner_id = auth.uid()
        )
    )
  );

-- Admin يقرأ الكل
CREATE POLICY "admin_read_all" ON customers
  FOR SELECT USING (public.is_admin());

-- Admin فقط يعدل أو يحذف
CREATE POLICY "admin_update" ON customers
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- customer_addresses
-- =============================================
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- العميل يقرأ عناوينه
CREATE POLICY "read_own" ON customer_addresses
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- Admin يقرأ الكل
CREATE POLICY "admin_read_all" ON customer_addresses
  FOR SELECT USING (public.is_admin());

-- Admin يدير الكل
CREATE POLICY "admin_all" ON customer_addresses
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- drivers
-- =============================================
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- السائق يقرأ سجله فقط
CREATE POLICY "read_own" ON drivers
  FOR SELECT USING (profile_id = auth.uid());

-- Admin يقرأ الكل
CREATE POLICY "admin_read_all" ON drivers
  FOR SELECT USING (public.is_admin());

-- السائق يحدث بياناته
CREATE POLICY "update_own" ON drivers
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Admin يحدث أي سائق
CREATE POLICY "admin_update" ON drivers
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- driver_documents
-- =============================================
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;

-- السائق يقرأ مستنداته
CREATE POLICY "read_own" ON driver_documents
  FOR SELECT USING (
    driver_id IN (SELECT id FROM drivers WHERE profile_id = auth.uid())
  );

-- Admin يقرأ ويدير الكل
CREATE POLICY "admin_read_all" ON driver_documents
  FOR SELECT USING (public.is_admin());

-- Admin يحدث حالة المستندات
CREATE POLICY "admin_update" ON driver_documents
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());
