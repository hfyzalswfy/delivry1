-- =============================================
-- 019_rls_reference.sql
-- RLS: دوال المساعدة + جداول المرجع
-- =============================================

-- -----------------------------------------
-- دالة: public.is_admin()
-- تتحقق إذا كان المستخدم الحالي Admin
-- تستخدم JWT claims (أسرع من subquery على profiles)
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((auth.jwt() ->> 'user_role') = 'admin', false);
$$;

-- -----------------------------------------
-- دالة: public.user_role()
-- ترجع دور المستخدم الحالي من JWT
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.jwt() ->> 'user_role';
$$;

-- =============================================
-- جداول المرجع (Read for all, Write for admin)
-- =============================================

ALTER TABLE shipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- الجميع المصادق عليهم يقرؤون
CREATE POLICY "read_authenticated" ON shipment_types
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "read_authenticated" ON notification_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin فقط يكتب
CREATE POLICY "admin_insert" ON shipment_types
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "admin_update" ON shipment_types
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_delete" ON shipment_types
  FOR DELETE USING (public.is_admin());

CREATE POLICY "admin_insert" ON notification_templates
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "admin_update" ON notification_templates
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_delete" ON notification_templates
  FOR DELETE USING (public.is_admin());
