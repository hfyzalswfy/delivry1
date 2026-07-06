-- =============================================
-- 045_fix_rls_recursive_chat.sql
-- Fix: Infinite recursion in conversation_participants RLS
--
-- السبب الجذري:
--   conversation_participants → "participant_select" (023:31)
--   يستعلم عن conversation_participants داخل USING expression:
--     conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE profile_id = auth.uid())
--   مما يسبب استدعاء ذاتي لا نهائي لأن كل استعلام داخلي يخضع لـ RLS.
--
-- سلسلة التكرار عند إرسال رسالة:
--   1. INSERT INTO messages
--   2. "participant_insert" ON messages (023:58) → EXISTS (SELECT ... FROM conversation_participants)
--   3. "participant_select" ON conversation_participants (023:31) → SELECT ... FROM conversation_participants
--   4. الاستعلام في step 3 يُفعّل نفس السياسة ← حلقة لا نهائية
--
-- الحل:
--   إنشاء دالة SECURITY DEFINER تستعلم عن conversation_participants
--   بدون المرور عبر RLS، ثم استخدامها في جميع Policies.
--
-- الـ Policies المعاد كتابتها:
--   1. conversation_participants → participant_select
--   2. conversations          → participant_select
--   3. messages               → participant_select
--   4. messages               → participant_insert
--
-- الـ Policies التي لم تتغير (لا تستعلم عن conversation_participants):
--   - conversations          → participant_insert  (041 — تستعلم عن delivery_orders/stores/etc.)
--   - conversation_participants → participant_insert (041 — تستعلم عن conversations/delivery_orders/etc.)
--   - admin_select           (جميع الجداول — تستخدم is_admin() فقط)
--
-- Idempotent: يمكن تطبيقه عدة مرات
-- =============================================

-- =============================================
-- 1. دالة المساعدة: التحقق من عضوية المحادثة
--    SECURITY DEFINER لتجاوز RLS ومنع التكرار
-- =============================================

CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_profile_id      UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = p_conversation_id
      AND profile_id = p_profile_id
  );
END;
$$;

-- =============================================
-- 2. إعادة كتابة conversation_participants → participant_select
--    كانت تسبب التكرار الذاتي المباشر
-- =============================================

DROP POLICY IF EXISTS "participant_select" ON conversation_participants;

CREATE POLICY "participant_select" ON conversation_participants
  FOR SELECT USING (
    is_conversation_participant(conversation_id, auth.uid())
  );

-- =============================================
-- 3. إعادة كتابة conversations → participant_select
--    كانت تستعلم عن conversation_participants مما يُشغّل التكرار
-- =============================================

DROP POLICY IF EXISTS "participant_select" ON conversations;

CREATE POLICY "participant_select" ON conversations
  FOR SELECT USING (
    is_conversation_participant(id, auth.uid())
  );

-- =============================================
-- 4. إعادة كتابة messages → participant_select
--    كانت تستعلم عن conversation_participants
-- =============================================

DROP POLICY IF EXISTS "participant_select" ON messages;

CREATE POLICY "participant_select" ON messages
  FOR SELECT USING (
    is_conversation_participant(conversation_id, auth.uid())
  );

-- =============================================
-- 5. إعادة كتابة messages → participant_insert
--    كانت تستعلم عن conversation_participants
-- =============================================

DROP POLICY IF EXISTS "participant_insert" ON messages;

CREATE POLICY "participant_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND is_conversation_participant(conversation_id, auth.uid())
  );

-- =============================================
-- 6. التحقق
-- =============================================

DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_conversation_participant'
  ), 'is_conversation_participant() must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversation_participants' AND policyname = 'participant_select'
  ), 'participant_select on conversation_participants must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversations' AND policyname = 'participant_select'
  ), 'participant_select on conversations must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages' AND policyname = 'participant_select'
  ), 'participant_select on messages must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages' AND policyname = 'participant_insert'
  ), 'participant_insert on messages must exist';

  RAISE NOTICE 'Migration 045 applied successfully — RLS recursion fixed';
END
$$;
