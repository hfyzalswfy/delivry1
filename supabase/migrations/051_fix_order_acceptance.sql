-- =============================================
-- 051_fix_order_acceptance.sql
-- يصلح مشكلة قبول السائق للطلب ومشكلة إشعارات العميل
--
-- التغييرات:
--   1. RPC جديد: accept_order (SECURITY DEFINER)
--      يُنشئ سجل تعيين مع trigger ينقل الحالة
--      يتجاوز RLS لأن driver_update يمنع التحديث
--      قبل تعيين السائق
--   2. تحديث create_order_notifications
--      دعم العملاء غير المرتبطين بـ customer_id
--      البحث عبر customer_phone كخطة بديلة
-- =============================================

-- -----------------------------------------
-- 1. RPC: accept_order
--    يُنشئ سجل تعيين (order_assignments) مع status='accepted'
--    الـ trigger trg_sync_assigned_driver سينقل الحالة تلقائياً
--    مع التحقق من أن الطلب لا يزال pending
--    SECURITY DEFINER: يتجاوز RLS لمنع حظر القبول
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.accept_order(
  p_order_id UUID,
  p_driver_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order delivery_orders%ROWTYPE;
  v_assignment_id UUID;
  v_driver_profile_id UUID;
BEGIN
  -- قفل الطلب لمنع السباق (race condition)
  SELECT * INTO v_order
  FROM delivery_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND', 'error', 'Order not found');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_ASSIGNED', 'error', format('Order status is %s, not pending', v_order.status));
  END IF;

  -- التحقق من وجود السائق
  SELECT profile_id INTO v_driver_profile_id FROM drivers WHERE id = p_driver_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'DRIVER_NOT_FOUND', 'error', 'Driver not found');
  END IF;

  -- إنشاء سجل التعيين — trigger trg_sync_assigned_driver سينفذ تلقائياً:
  --   1. تحديث delivery_orders (status → driver_accepted, assigned_driver_id, ...)
  --   2. إلغاء التعيينات المعلقة الأخرى
  -- هذا يحدث في نفس المعاملة (atomic)
  INSERT INTO order_assignments (order_id, driver_id, status, responded_at)
  VALUES (p_order_id, p_driver_id, 'accepted', now())
  RETURNING id INTO v_assignment_id;

  -- trigger trg_sync_assigned_driver اكتمل الآن
  -- تسجيل تاريخ الحالة
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
  VALUES (p_order_id, 'pending', 'driver_accepted', v_driver_profile_id);

  RETURN jsonb_build_object('success', true, 'assignment_id', v_assignment_id, 'error', null);
END;
$$;

-- -----------------------------------------
-- 2. تحديث create_order_notifications
--    دعم العملاء غير المرتبطين بـ customer_id
--    البحث عبر customer_phone كخطة بديلة
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_notifications(
  p_order_id           UUID,
  p_order_number       TEXT,
  p_new_status         order_status,
  p_store_id           UUID,
  p_customer_id        UUID,
  p_assigned_driver_id UUID,
  p_driver_name        TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_store_owner   UUID;
  v_store_name    TEXT;
  v_customer_prof UUID;
  v_driver_prof   UUID;
BEGIN
  SELECT s.owner_id, s.name INTO v_store_owner, v_store_name
  FROM stores s WHERE s.id = p_store_id;

  -- البحث عن العميل: أولاً عبر customer_id، ثم عبر رقم الهاتف
  -- (يدعم العملاء غير المسجلين الذين لديهم customer_phone فقط)
  IF p_customer_id IS NOT NULL THEN
    SELECT c.profile_id INTO v_customer_prof
    FROM customers c WHERE c.id = p_customer_id;
  END IF;

  IF v_customer_prof IS NULL THEN
    SELECT c.profile_id INTO v_customer_prof
    FROM delivery_orders do2
    JOIN customers c ON c.phone = do2.customer_phone
    WHERE do2.id = p_order_id AND do2.customer_phone IS NOT NULL;
  END IF;

  IF p_assigned_driver_id IS NOT NULL THEN
    SELECT d.profile_id INTO v_driver_prof
    FROM drivers d WHERE d.id = p_assigned_driver_id;
  END IF;

  CASE p_new_status
    WHEN 'driver_accepted' THEN
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (v_store_owner, 'order_update', 'تم تعيين سائق', format('تم تعيين السائق %s لتوصيل الطلب رقم %s', p_driver_name, p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_customer_prof, 'order_update', 'تم تعيين سائق', format('تم تعيين سائق لتوصيل طلبك رقم %s', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_driver_prof, 'order_update', 'تم تعيينك لتوصيل طلب', format('تم تعيينك لتوصيل الطلب رقم %s', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;

    WHEN 'driver_arrived_store' THEN
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (v_store_owner, 'order_update', 'السائق في المتجر', format('وصل السائق %s إلى المتجر لاستلام الطلب رقم %s', p_driver_name, p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_customer_prof, 'order_update', 'السائق في المتجر', format('وصل السائق إلى المتجر لاستلام طلبك رقم %s', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_driver_prof, 'order_update', 'وصلت إلى المتجر', format('لقد وصلت إلى المتجر لاستلام الطلب رقم %s', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;

    WHEN 'picked_up' THEN
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_customer_prof, 'order_update', 'تم استلام الطلب', format('تم استلام طلبك رقم %s من المتجر وجاري التوصيل', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (v_store_owner, 'order_update', 'تم استلام الطلب من المتجر', format('تم استلام الطلب رقم %s من المتجر بواسطة السائق %s', p_order_number, p_driver_name), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_driver_prof, 'order_update', 'تم استلام الطلب', format('لقد استلمت الطلب رقم %s وجاري التوصيل', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;

    WHEN 'on_the_way' THEN
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_customer_prof, 'order_update', 'السائق في الطريق', format('السائق في الطريق إليك. الطلب رقم %s', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (v_store_owner, 'order_update', 'السائق في الطريق', format('السائق %s في الطريق لتوصيل الطلب رقم %s', p_driver_name, p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_driver_prof, 'order_update', 'في الطريق إلى الوجهة', format('أنت في الطريق لتوصيل الطلب رقم %s', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;

    WHEN 'driver_arrived_destination' THEN
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_customer_prof, 'order_update', 'السائق في الموقع', format('وصل السائق إلى موقعك. الطلب رقم %s', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (v_store_owner, 'order_update', 'السائق في وجهة التوصيل', format('وصل السائق %s إلى وجهة التوصيل للطلب رقم %s', p_driver_name, p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_driver_prof, 'order_update', 'وصلت إلى الوجهة', format('لقد وصلت إلى وجهة التوصيل للطلب رقم %s', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;

    WHEN 'delivered' THEN
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (v_store_owner, 'order_update', 'تم التوصيل', format('تم توصيل الطلب رقم %s بنجاح', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_customer_prof, 'order_update', 'تم التوصيل ✓', format('تم توصيل طلبك رقم %s بنجاح', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_driver_prof, 'order_update', 'تم التوصيل ✓', format('تم توصيل الطلب رقم %s', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;

    WHEN 'cancelled' THEN
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (v_store_owner, 'order_update', 'تم إلغاء الطلب', format('تم إلغاء الطلب رقم %s', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      IF v_customer_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_customer_prof, 'order_update', 'تم إلغاء الطلب', format('تم إلغاء طلبك رقم %s', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;
      IF v_driver_prof IS NOT NULL THEN
        INSERT INTO notifications (profile_id, notification_type, title, body, data)
        VALUES (v_driver_prof, 'order_update', 'تم إلغاء الطلب', format('تم إلغاء الطلب رقم %s', p_order_number), jsonb_build_object('order_id', p_order_id, 'status', p_new_status));
      END IF;

    ELSE
      NULL;
  END CASE;
END;
$$;

-- =============================================
-- التحقق
-- =============================================
DO $$
DECLARE
  has_rpc BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'accept_order') INTO has_rpc;
  IF has_rpc THEN
    RAISE NOTICE 'Migration 051 applied successfully — accept_order RPC created';
  ELSE
    RAISE WARNING 'Migration 051: accept_order RPC was not created';
  END IF;
END $$;
