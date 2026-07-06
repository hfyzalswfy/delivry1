-- =============================================
-- 014_notifications.sql
-- نظام الإشعارات (Notification Center)
-- سجل داخلي + أساس لإرسال Push Notifications
-- =============================================

-- -----------------------------------------
-- أنواع الإشعارات
-- توسيع مستقبلي:
-- ALTER TYPE notification_type ADD VALUE 'promotion' AFTER 'system';
-- -----------------------------------------
CREATE TYPE notification_type AS ENUM (
  'order_update',       -- تحديث حالة الطلب (متجر/عميل)
  'new_message',        -- رسالة جديدة في الدردشة
  'driver_assignment',  -- تعيين سائق (للسائق نفسه)
  'nearby_order',       -- طلب جديد قريب (للسائق)
  'complaint_update',   -- تحديث بلاغ / نزاع
  'system'              -- إشعار عام من الإدارة
);

-- -----------------------------------------
-- جدول: notifications
-- -----------------------------------------
CREATE TABLE notifications (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title             TEXT              NOT NULL,
  body              TEXT              NOT NULL,
  data              JSONB,
  read_at           TIMESTAMPTZ,      -- NULL = غير مقروء
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT now()
);

COMMENT ON COLUMN notifications.data IS
  'بيانات إضافية لتوجيه المستخدم عند النقر على الإشعار.
   مثال:
   {"order_id": "uuid", "status": "driver_accepted"}
   {"conversation_id": "uuid"}
   {"dispute_id": "uuid"}';

-- -----------------------------------------
-- الفهارس
-- -----------------------------------------

-- أساسي: عرض سجل الإشعارات لمستخدم معين
CREATE INDEX idx_notifications_profile
  ON notifications(profile_id, created_at DESC);

-- Partial: عدّ الإشعارات غير المقروءة (صغير جداً)
CREATE INDEX idx_notifications_unread
  ON notifications(profile_id)
  WHERE read_at IS NULL;
