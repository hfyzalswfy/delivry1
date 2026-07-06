-- =============================================
-- 038_create_notification_triggers.sql
-- ينشئ إشعارات تلقائياً عند:
--   1. إنشاء طلب جديد → للسائقين المتاحين
--   2. تغير حالة الطلب → للمتجر/العميل/السائق
-- =============================================

-- -----------------------------------------
-- 1. تحديث سياسة INSERT: نمنع الوصول المباشر
--    الـ trigger يعمل بـ SECURITY DEFINER ويتجاوز RLS
--    Edge Function تستخدم service_role وتتجاوز RLS
-- -----------------------------------------
DROP POLICY IF EXISTS "system_insert" ON notifications;

CREATE POLICY "system_insert" ON notifications
FOR INSERT
WITH CHECK (true);

-- -----------------------------------------
-- 2. دالة trigger: تُنشئ الإشعارات حسب الحدث
-- -----------------------------------------
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

    WHEN 'driver_arrived_store' THEN
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (
        v_store_owner, 'order_update',
        'السائق في المتجر',
        format('وصل السائق %s إلى المتجر لاستلام الطلب رقم %s', v_driver_name, NEW.order_number),
        jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
      );

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

-- -----------------------------------------
-- 3. Trigger عند إنشاء طلب جديد
-- -----------------------------------------
DROP TRIGGER IF EXISTS trg_notify_new_order ON delivery_orders;

CREATE TRIGGER trg_notify_new_order
AFTER INSERT ON delivery_orders
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.notify_order_status_change();

-- -----------------------------------------
-- 4. Trigger عند تغير حالة الطلب
-- -----------------------------------------
DROP TRIGGER IF EXISTS trg_notify_order_status ON delivery_orders;

CREATE TRIGGER trg_notify_order_status
AFTER UPDATE OF status ON delivery_orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_status_change();

-- =============================================
-- التحقق
-- =============================================
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_notify_new_order'
    AND event_object_table = 'delivery_orders'
  ), 'Trigger trg_notify_new_order was not created';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_notify_order_status'
    AND event_object_table = 'delivery_orders'
  ), 'Trigger trg_notify_order_status was not created';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND policyname = 'system_insert'
  ), 'Policy system_insert was not updated';
END $$;
