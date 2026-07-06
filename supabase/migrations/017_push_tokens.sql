-- =============================================
-- 017_push_tokens.sql
-- ربط أجهزة المستخدمين لإرسال Push Notifications
-- =============================================

CREATE TABLE push_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE,
  platform   TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN push_tokens.platform IS 'ios, android, web';

CREATE INDEX idx_push_tokens_profile
  ON push_tokens(profile_id)
  WHERE is_active = true;
