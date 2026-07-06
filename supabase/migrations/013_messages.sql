-- =============================================
-- 013_messages.sql
-- نظام الرسائل والدردشة
-- بنية قابلة للتوسع لدعم الوسائط المتعددة
-- =============================================

-- -----------------------------------------
-- أنواع الرسائل المدعومة
-- يمكن توسيعها مستقبلاً عبر:
-- ALTER TYPE message_type ADD VALUE 'document' AFTER 'file';
-- -----------------------------------------
CREATE TYPE message_type AS ENUM (
  'text',     -- نص عادي
  'image',    -- صورة
  'voice',    -- تسجيل صوتي
  'video',    -- مقطع فيديو
  'file',     -- ملف / مستند
  'location', -- موقع جغرافي
  'system'    -- رسالة نظام (تحديث حالة الطلب)
);

-- -----------------------------------------
-- جدول: messages
-- -----------------------------------------
CREATE TABLE messages (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID         NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id         UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_type      message_type NOT NULL DEFAULT 'text',
  content           TEXT         NOT NULL,
  metadata          JSONB,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON COLUMN messages.content IS $$
محتوى الرسالة يختلف حسب message_type:
text     → نص الرسالة
image    → Supabase Storage URL
voice    → Supabase Storage URL
video    → Supabase Storage URL
file     → Supabase Storage URL
location → Google Maps URL (قابل للنقر)
system   → نص التحديث (مثال: تم قبول الطلب)
$$;

COMMENT ON COLUMN messages.metadata IS $$
بيانات إضافية حسب message_type (JSON):
image    → {"width":1920, "height":1080, "thumbnail":"url", "file_size":204800}
voice    → {"duration_seconds":45, "file_size":102400}
video    → {"duration_seconds":120, "width":1920, "height":1080, "thumbnail":"url", "file_size":5242880}
file     → {"file_name":"report.pdf", "file_size":204800, "mime_type":"application/pdf"}
location → {"latitude":30.0444, "longitude":31.2357, "label":"مطعم النيل"}
system   → {"order_status":"driver_accepted", "previous_status":"published"}
$$;

-- -----------------------------------------
-- الفهارس
-- -----------------------------------------

-- أساسي: عرض محادثة + تحميل تدريجي (Infinite Scroll)
CREATE INDEX idx_messages_conversation
  ON messages(conversation_id, created_at DESC);

-- اختياري: البحث عن رسائل مستخدم معين (للإدارة)
CREATE INDEX idx_messages_sender
  ON messages(sender_id, created_at DESC);
