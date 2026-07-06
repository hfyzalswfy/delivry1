-- =============================================
-- 046_fix_notification_missing_cases.sql
-- Fix: إضافة الإشعارات المفقودة لبعض حالات الطلب
--
-- المشكلة:
--   الدالة notify_order_status_change() لا ترسل إشعاراً
--   لجميع الأطراف في بعض الحالات.
--
-- الحالات الناقصة:
--   driver_accepted  → السائق (كان مفقوداً)
--   driver_arrived_store → العميل + السائق (كانا مفقودين)
--   picked_up        → المتجر + السائق (كانا مفقودين)
--   on_the_way       → المتجر + السائق (كانا مفقودين)
--
-- الحالات الصحيحة:
--   pending          ← جميع السائقين المتاحين  ✅
--   delivered        ← المتجر + العميل + السائق ✅
--   cancelled        ← المتجر + العميل + السائق ✅
--
-- Idempotent: CREATE OR REPLACE FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_driver_name   TEXT;
  v_store_name    TEXT;
  v_store_owner   UUID;
  v_customer_prof UUID;
  v_driver_prof   UUID;
  v_driver_rec    RECORD;
BEGIN
  -- =========================================
  -- حالة INSERT: طلب جديد ← للسائقين المتاحين
  -- =========================================
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    FOR v_driver_rec IN
      SELECT d.profile_id
      FROM drivers d
      WHERE d.availability = 'online'
    LOOP
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (
        v_driver_rec.profile_id,
        'nearby_order',
        'طلب توصيل متاح',
        'يوجد طلب توصيل جديد بالقرب منك',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number, 'status', NEW.status)
      );
    END LOOP;

    RETURN NEW;
  END IF;

  -- =========================================
  -- حالة UPDATE: تغير الحالة
  -- =========================================
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- البيانات المساعدة
  SELECT p.full_name INTO v_driver_name
  FROM drivers d JOIN profiles p ON p.id = d.profile_id
  WHERE d.id = NEW.assigned_driver_id;

  SELECT s.owner_id, s.name INTO v_store_owner, v_store_name
  FROM stores s WHERE s.id = NEW.store_id;

  IF NEW.customer_id IS NOT NULL THEN
    SELECT c.profile_id INTO v_customer_prof
    FROM customers c WHERE c.id = NEW.customer_id;
  END IF;

  IF NEW.assigned_driver_id IS NOT NULL THEN
    SELECT d.profile_id INTO v_driver_prof
    FROM drivers d WHERE d.id = NEW.assigned_driver_id;
  END IF;

  -- =========================================
  -- الإشعارات حسب الحالة الجديدة
  -- =========================================
  CASE NEW.status

    WHEN 'driver_accepted' THEN
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (
        v_store_owner, 'order_update',
        'تم تعيين سائق',
        format('تم تعيين السائق %s لتوصيل الطلب رقم %s', v_driver_name, NEW.order_number),
        jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
      );
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (
          v_customer_prof, 'order_update',
          'تم تعيين سائق',
          format('تم تعيين سائق لتوصيل طلبك رقم %s', NEW.order_number),
          jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
      END IF;
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (
          v_driver_prof, 'order_update',
          'تم تعيينك لتوصيل طلب',
          format('تم تعيينك لتوصيل الطلب رقم %s', NEW.order_number),
          jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
      END IF;

    WHEN 'driver_arrived_store' THEN
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (
        v_store_owner, 'order_update',
        'السائق في المتجر',
        format('وصل السائق %s إلى المتجر لاستلام الطلب رقم %s', v_driver_name, NEW.order_number),
        jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
      );
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (
          v_customer_prof, 'order_update',
          'السائق في المتجر',
          format('وصل السائق إلى المتجر لاستلام طلبك رقم %s', NEW.order_number),
          jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
      END IF;
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (
          v_driver_prof, 'order_update',
          'وصلت إلى المتجر',
          format('لقد وصلت إلى المتجر لاستلام الطلب رقم %s', NEW.order_number),
          jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
      END IF;

    WHEN 'picked_up' THEN
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (
          v_customer_prof, 'order_update',
          'تم استلام الطلب',
          format('تم استلام طلبك رقم %s من المتجر وجاري التوصيل', NEW.order_number),
          jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
      END IF;
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (
        v_store_owner, 'order_update',
        'تم استلام الطلب من المتجر',
        format('تم استلام الطلب رقم %s من المتجر بواسطة السائق %s', NEW.order_number, v_driver_name),
        jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
      );
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (
          v_driver_prof, 'order_update',
          'تم استلام الطلب',
          format('لقد استلمت الطلب رقم %s وجاري التوصيل', NEW.order_number),
          jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
      END IF;

    WHEN 'on_the_way' THEN
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (
          v_customer_prof, 'order_update',
          'السائق في الطريق',
          format('السائق في الطريق إليك. الطلب رقم %s', NEW.order_number),
          jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
      END IF;
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (
        v_store_owner, 'order_update',
        'السائق في الطريق',
        format('السائق %s في الطريق لتوصيل الطلب رقم %s', v_driver_name, NEW.order_number),
        jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
      );
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (
          v_driver_prof, 'order_update',
          'في الطريق إلى الوجهة',
          format('أنت في الطريق لتوصيل الطلب رقم %s', NEW.order_number),
          jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
      END IF;

    WHEN 'delivered' THEN
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (
        v_store_owner, 'order_update',
        'تم التوصيل',
        format('تم توصيل الطلب رقم %s بنجاح', NEW.order_number),
        jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
      );
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (
          v_customer_prof, 'order_update',
          'تم التوصيل ✓',
          format('تم توصيل طلبك رقم %s بنجاح', NEW.order_number),
          jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
      END IF;
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (
          v_driver_prof, 'order_update',
          'تم التوصيل ✓',
          format('تم توصيل الطلب رقم %s', NEW.order_number),
          jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
      END IF;

    WHEN 'cancelled' THEN
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (
        v_store_owner, 'order_update',
        'تم إلغاء الطلب',
        format('تم إلغاء الطلب رقم %s', NEW.order_number),
        jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
      );
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (
          v_customer_prof, 'order_update',
          'تم إلغاء الطلب',
          format('تم إلغاء طلبك رقم %s', NEW.order_number),
          jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
      END IF;
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (
          v_driver_prof, 'order_update',
          'تم إلغاء الطلب',
          format('تم إلغاء الطلب رقم %s', NEW.order_number),
          jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
        );
      END IF;

    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

-- =============================================
-- التحقق
-- =============================================
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'notify_order_status_change'
  ), 'notify_order_status_change() must exist';

  RAISE NOTICE 'Migration 046 applied successfully — missing notifications added';
END
$$;
