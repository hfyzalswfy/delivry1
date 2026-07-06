-- =============================================
-- 027_rls_fix_insert_policies.sql
-- إصلاح: إضافة INSERT policies مفقودة للمستخدمين
-- =============================================

-- profiles: المستخدم ينشئ ملفه الشخصي عند التسجيل
DROP POLICY IF EXISTS "insert_own" ON profiles;
CREATE POLICY "insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- stores: المستخدم ينشئ متجره الخاص (العمود owner_id وليس profile_id)
DROP POLICY IF EXISTS "insert_own" ON stores;
CREATE POLICY "insert_own" ON stores
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- customers: المستخدم ينشئ سجل عميل خاص به
DROP POLICY IF EXISTS "insert_own" ON customers;
CREATE POLICY "insert_own" ON customers
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- drivers: المستخدم ينشئ سجل سائق خاص به
DROP POLICY IF EXISTS "insert_own" ON drivers;
CREATE POLICY "insert_own" ON drivers
  FOR INSERT WITH CHECK (profile_id = auth.uid());
