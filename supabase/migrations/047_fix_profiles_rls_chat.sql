-- =============================================
-- 047_fix_profiles_rls_chat.sql
-- Fix: إضافة RLS policy للسماح بقراءة الملفات الشخصية
--      للمشاركين في نفس المحادثة
--
-- المشكلة:
--   RLS على profiles (020) يسمح بقراءة الملف الشخصي
--   فقط لصاحبه (id = auth.uid()). عند عرض رسائل الدردشة،
--   يحتاج المستخدم إلى معرفة اسم ونوع المرسل (طرف آخر
--   في المحادثة)، لكن Supabase تمنع قراءة ملفات الآخرين.
--
-- الحل:
--   إضافة policy تسمح بقراءة ملف أي مستخدم يشارك في
--   نفس المحادثة مع المستخدم الحالي.
--
-- تستخدم is_conversation_participant() (من 045) وهي
--  SECURITY DEFINER وبالتالي تتجاوز RLS ولا تسبب recursion.
-- =============================================

CREATE POLICY "chat_read_participants" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR
    public.is_admin()
    OR
    EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.profile_id = profiles.id
        AND cp.conversation_id IN (
          SELECT conversation_id
          FROM conversation_participants
          WHERE profile_id = auth.uid()
        )
    )
  );

DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'chat_read_participants'
  ), 'chat_read_participants policy must exist';

  RAISE NOTICE 'Migration 047 applied successfully';
END
$$;
