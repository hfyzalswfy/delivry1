-- =============================================
-- 018_seed_notification_templates.sql
-- قوالب الإشعارات الموحدة (عربي + إنجليزي)
-- تستخدمها Edge Functions لتوليد Push Notifications
-- =============================================

-- -----------------------------------------
-- جدول القوالب
-- -----------------------------------------
CREATE TABLE notification_templates (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type notification_type NOT NULL UNIQUE,
  title_ar          TEXT              NOT NULL,
  title_en          TEXT              NOT NULL,
  body_ar           TEXT              NOT NULL,
  body_en           TEXT              NOT NULL,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT now()
);

COMMENT ON TABLE notification_templates IS
  'قوالب الإشعارات الجاهزة. تُقرأ بواسطة Edge Functions عند إرسال الإشعارات.';

-- -----------------------------------------
-- إدخال القوالب الستة
-- -----------------------------------------
INSERT INTO notification_templates
  (notification_type, title_ar, title_en, body_ar, body_en)
VALUES
  ('order_update',
   'تحديث الطلب',
   'Order Update',
   'تم تحديث حالة الطلب رقم {order_number} إلى: {status}',
   'Order #{order_number} status updated to: {status}'),

  ('new_message',
   'رسالة جديدة',
   'New Message',
   'لديك رسالة جديدة من {sender_name} بخصوص الطلب رقم {order_number}',
   'You have a new message from {sender_name} regarding order #{order_number}'),

  ('driver_assignment',
   'تم تعيين سائق',
   'Driver Assigned',
   'تم تعيين السائق {driver_name} لتوصيل الطلب رقم {order_number}',
   'Driver {driver_name} has been assigned to deliver order #{order_number}'),

  ('nearby_order',
   'طلب توصيل متاح',
   'Delivery Order Available',
   'يوجد طلب توصيل جديد بالقرب منك. المسافة التقريبية: {distance_km} كم',
   'A new delivery order is available near you. Approximate distance: {distance_km} km'),

  ('complaint_update',
   'تحديث البلاغ',
   'Complaint Update',
   'تم تحديث حالة البلاغ رقم {complaint_number} إلى: {status}',
   'Complaint #{complaint_number} status updated to: {status}'),

  ('system',
   'إشعار من النظام',
   'System Notification',
   '{message}',
   '{message}')

ON CONFLICT (notification_type) DO NOTHING;
