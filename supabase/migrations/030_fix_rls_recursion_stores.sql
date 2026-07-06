-- =============================================
-- 030_fix_rls_recursion_stores.sql
-- إصلاح: حلقة RLS اللانهائية بين stores و store_staff
-- السبب: stores.read_staff يستعلم store_staff
--        store_staff.read_store_owner يستعلم stores
--        → recursion لا نهائي
-- الحل: استخدام SECURITY DEFINER function لكسر الحلقة
-- =============================================

-- دالة مساعدة: التحقق من ملكية المتجر بدون RLS
CREATE OR REPLACE FUNCTION public.is_store_owner(store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = store_id AND owner_id = auth.uid()
  );
$$;

-- إصلاح سياسة store_staff.read_store_owner
-- تستخدم الدالة بدلاً من الاستعلام المباشر لتجنب recursion
DROP POLICY IF EXISTS "read_store_owner" ON store_staff;
CREATE POLICY "read_store_owner" ON store_staff
  FOR SELECT USING (public.is_store_owner(store_id));
