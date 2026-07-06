-- =============================================
-- 003_profiles.sql
-- جدول جميع المستخدمين المسجلين في النظام
-- يرتبط مباشرة مع auth.users عبر المفتاح الأساسي
-- =============================================

CREATE TABLE profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       user_role   NOT NULL,
  full_name  TEXT        NOT NULL,
  phone      TEXT,
  avatar_url TEXT,

  is_active  BOOLEAN     NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------
-- Indexes للأداء
-- -----------------------------------------
CREATE INDEX idx_profiles_role   ON profiles(role);
CREATE INDEX idx_profiles_phone ON profiles(phone)
  WHERE phone IS NOT NULL;
CREATE INDEX idx_profiles_active ON profiles(is_active)
  WHERE is_active = true;
CREATE INDEX idx_profiles_not_deleted ON profiles(deleted_at)
  WHERE deleted_at IS NULL;

-- -----------------------------------------
-- Trigger: تحديث updated_at تلقائياً
-- -----------------------------------------
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
