-- =============================================
-- 012_conversations.sql
-- المحادثات والمشاركون في نظام الدردشة
-- كل طلب = محادثة واحدة (علاقة 1:1)
-- =============================================

-- -----------------------------------------
-- جدول: conversations
-- -----------------------------------------
CREATE TABLE conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID        NOT NULL UNIQUE REFERENCES delivery_orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------
-- جدول: conversation_participants
-- -----------------------------------------
CREATE TABLE conversation_participants (
  id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID      NOT NULL REFERENCES conversations(id)    ON DELETE CASCADE,
  profile_id        UUID      NOT NULL REFERENCES profiles(id)         ON DELETE CASCADE,
  participant_role  user_role NOT NULL,
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(conversation_id, profile_id)
);

CREATE INDEX idx_conversation_participants_profile
  ON conversation_participants(profile_id);
