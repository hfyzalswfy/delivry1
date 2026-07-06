-- =============================================
-- 023_rls_chat.sql
-- RLS: الدردشة (conversations, participants, messages)
-- =============================================

-- =============================================
-- conversations
-- =============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- المشاركون يرون محادثاتهم
CREATE POLICY "participant_select" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
        AND profile_id = auth.uid()
    )
  );

-- Admin: الكل
CREATE POLICY "admin_select" ON conversations
  FOR SELECT USING (public.is_admin());

-- =============================================
-- conversation_participants
-- =============================================
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- المشاركون يرون أعضاء محادثاتهم
CREATE POLICY "participant_select" ON conversation_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE profile_id = auth.uid()
    )
  );

-- Admin: الكل
CREATE POLICY "admin_select" ON conversation_participants
  FOR SELECT USING (public.is_admin());

-- =============================================
-- messages
-- =============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- المشاركون يقرؤون رسائل محادثاتهم
CREATE POLICY "participant_select" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE profile_id = auth.uid()
    )
  );

-- المشاركون يرسلون رسائل (مع التحقق من عضويتهم في المحادثة)
CREATE POLICY "participant_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND profile_id = auth.uid()
    )
  );

-- Admin: الكل
CREATE POLICY "admin_select" ON messages
  FOR SELECT USING (public.is_admin());
