-- =============================================
-- 043_fix_chat_conversation_rpc.sql
-- Fix: Chat system — ensure_conversation RPC +
--      automatic driver participant enrollment
--
-- يحل مشكلتين:
-- 1. التطبيق يستدعي ensure_conversation() غير موجودة
-- 2. السائق لا يُضاف إلى المحادثة عند تعيينه
--
-- Idempotent: يمكن تطبيقه عدة مرات
-- =============================================

-- =============================================
-- 1. RPC: ensure_conversation
--    SECURITY DEFINER
--    تبحث أو تنشئ محادثة + تضيف المشارك
--    تُرجع conversation_id (UUID)
-- =============================================

DROP FUNCTION IF EXISTS public.ensure_conversation(UUID, UUID, user_role);

CREATE OR REPLACE FUNCTION public.ensure_conversation(
  p_order_id         UUID,
  p_profile_id       UUID,
  p_participant_role user_role DEFAULT 'customer'
) RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  -- المتصل يجب أن يكون هو نفسه profile_id (يمنع إضافة شخص آخر)
  IF auth.uid() IS DISTINCT FROM p_profile_id THEN
    RAISE EXCEPTION 'ensure_conversation: profile_id must match authenticated user';
  END IF;

  -- بحث عن محادثة موجودة لهذا الطلب
  SELECT id INTO v_conv_id FROM conversations WHERE order_id = p_order_id;

  -- إنشاء محادثة جديدة إذا لم توجد
  IF v_conv_id IS NULL THEN
    INSERT INTO conversations (order_id)
    VALUES (p_order_id)
    RETURNING id INTO v_conv_id;
  END IF;

  -- إضافة المشارك إذا لم يكن موجوداً
  INSERT INTO conversation_participants (conversation_id, profile_id, participant_role)
  VALUES (v_conv_id, p_profile_id, p_participant_role)
  ON CONFLICT (conversation_id, profile_id) DO NOTHING;

  RETURN v_conv_id;
END;
$$;

-- =============================================
-- 2. Trigger: إضافة السائق للمحادثة تلقائياً
--    يعمل AFTER UPDATE OF assigned_driver_id
--    على delivery_orders
-- =============================================

DROP FUNCTION IF EXISTS public.add_driver_to_conversation();

CREATE OR REPLACE FUNCTION public.add_driver_to_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id        UUID;
  v_driver_profile UUID;
BEGIN
  -- فقط عند تعيين سائق جديد (وليس تحديثاً لنفس السائق)
  IF TG_OP = 'UPDATE'
     AND NEW.assigned_driver_id IS NOT NULL
     AND (OLD.assigned_driver_id IS NULL OR OLD.assigned_driver_id IS DISTINCT FROM NEW.assigned_driver_id)
  THEN
    -- الحصول على profile_id الخاص بالسائق
    SELECT profile_id INTO v_driver_profile FROM drivers WHERE id = NEW.assigned_driver_id;
    IF v_driver_profile IS NULL THEN RETURN NEW; END IF;

    -- البحث عن المحادثة أو إنشاؤها
    SELECT id INTO v_conv_id FROM conversations WHERE order_id = NEW.id;
    IF v_conv_id IS NULL THEN
      INSERT INTO conversations (order_id) VALUES (NEW.id) RETURNING id INTO v_conv_id;
    END IF;

    -- إضافة السائق كمشارك
    INSERT INTO conversation_participants (conversation_id, profile_id, participant_role)
    VALUES (v_conv_id, v_driver_profile, 'driver')
    ON CONFLICT (conversation_id, profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_driver_to_conversation ON delivery_orders;

CREATE TRIGGER trg_add_driver_to_conversation
  AFTER UPDATE OF assigned_driver_id ON delivery_orders
  FOR EACH ROW
  EXECUTE FUNCTION add_driver_to_conversation();

-- =============================================
-- 3. تفعيل Realtime لجداول المحادثة
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversation_participants'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
    END IF;
  END IF;
END
$$;

-- =============================================
-- 4. التحقق
-- =============================================

DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'ensure_conversation'
  ), 'ensure_conversation() must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'add_driver_to_conversation'
  ), 'add_driver_to_conversation() must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_add_driver_to_conversation'
  ), 'trg_add_driver_to_conversation trigger must exist';

  RAISE NOTICE 'Migration 043 applied successfully';
END
$$;
