-- =============================================
-- 041_fix_chat_rls_and_participants.sql
-- Fix: Missing INSERT policies on conversations
-- and conversation_participants tables
-- Idempotent: can be applied multiple times
-- =============================================

-- =============================================
-- conversations
-- =============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participant_insert" ON conversations;

-- يسمح للمشاركين في الطلب بإنشاء محادثة
CREATE POLICY "participant_insert" ON conversations
  FOR INSERT WITH CHECK (
    -- المستخدم هو صاحب المتجر (منشئ الطلب)
    EXISTS (
      SELECT 1
      FROM delivery_orders do2
      JOIN stores s ON s.id = do2.store_id
      WHERE do2.id = conversations.order_id
        AND s.owner_id = auth.uid()
    )
    OR
    -- المستخدم هو السائق المعين
    EXISTS (
      SELECT 1
      FROM order_assignments oa
      JOIN drivers d ON d.id = oa.driver_id
      WHERE oa.order_id = conversations.order_id
        AND d.profile_id = auth.uid()
        AND oa.status = 'accepted'
    )
    OR
    -- المستخدم هو العميل (عن طريق رقم الهاتف)
    EXISTS (
      SELECT 1
      FROM delivery_orders do2
      WHERE do2.id = conversations.order_id
        AND do2.customer_phone = (SELECT phone FROM profiles WHERE id = auth.uid())
    )
    OR
    -- Admin
    public.is_admin()
  );

-- =============================================
-- conversation_participants
-- =============================================
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participant_insert" ON conversation_participants;

-- يسمح لمنشئ المحادثة بإضافة المشاركين
CREATE POLICY "participant_insert" ON conversation_participants
  FOR INSERT WITH CHECK (
    -- المستخدم لديه صلاحية على المحادثة عبر كونه صاحب المتجر
    conversation_id IN (
      SELECT id FROM conversations
      WHERE order_id IN (
        SELECT do2.id
        FROM delivery_orders do2
        JOIN stores s ON s.id = do2.store_id
        WHERE s.owner_id = auth.uid()
      )
    )
    OR
    -- المستخدم لديه صلاحية على المحادثة عبر كونه السائق
    conversation_id IN (
      SELECT id FROM conversations
      WHERE order_id IN (
        SELECT oa.order_id
        FROM order_assignments oa
        JOIN drivers d ON d.id = oa.driver_id
        WHERE d.profile_id = auth.uid()
          AND oa.status = 'accepted'
      )
    )
    OR
    -- المستخدم لديه صلاحية على المحادثة عبر كونه العميل
    conversation_id IN (
      SELECT c.id
      FROM conversations c
      JOIN delivery_orders do2 ON do2.id = c.order_id
      WHERE do2.customer_phone = (SELECT phone FROM profiles WHERE id = auth.uid())
    )
    OR
    -- Admin
    public.is_admin()
  );
