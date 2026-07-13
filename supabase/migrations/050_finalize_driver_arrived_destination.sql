-- =============================================
-- 050_finalize_driver_arrived_destination.sql
-- هذه الـ Migration تحتوي فقط على العناصر التي
-- تشير إلى القيمة الجديدة driver_arrived_destination
-- وتُنفَّذ في معاملة منفصلة بعد 049
--
-- التغييرات:
--   1. دالة مساعدة: create_order_notifications (تشمل WHEN 'driver_arrived_destination')
--   2. تحديث التريجر: notify_order_status_change (يستدعي الدالة المساعدة)
--   3. RPC: arrive_at_destination (يستخدم 'driver_arrived_destination')
--   4. RPC: complete_delivery (يستخدم 'driver_arrived_destination')
--   5. مؤشر نشط جديد يشمل الحالة الجديدة
-- =============================================

-- -----------------------------------------
-- 1. دالة مساعدة لإنشاء إشعارات الطلبات
--    (تشمل WHEN 'driver_arrived_destination')
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

  IF p_customer_id IS NOT NULL THEN
    SELECT c.profile_id INTO v_customer_prof
    FROM customers c WHERE c.id = p_customer_id;
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

-- -----------------------------------------
-- 2. تحديث التريجر: notify_order_status_change
--    يفوض منطق الإشعارات إلى create_order_notifications
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_driver_name TEXT;
  v_driver_rec  RECORD;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    FOR v_driver_rec IN SELECT d.profile_id FROM drivers d WHERE d.availability = 'online'
    LOOP
      INSERT INTO notifications (profile_id, notification_type, title, body, data)
      VALUES (v_driver_rec.profile_id, 'nearby_order', 'طلب توصيل متاح', 'يوجد طلب توصيل جديد بالقرب منك', jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number, 'status', NEW.status));
    END LOOP;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT p.full_name INTO v_driver_name
  FROM drivers d JOIN profiles p ON p.id = d.profile_id
  WHERE d.id = NEW.assigned_driver_id;

  PERFORM create_order_notifications(
    NEW.id, NEW.order_number, NEW.status,
    NEW.store_id, NEW.customer_id, NEW.assigned_driver_id,
    v_driver_name
  );

  RETURN NEW;
END;
$$;

-- -----------------------------------------
-- 3. RPC: arrive_at_destination
--    يستخدم 'driver_arrived_destination'
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.arrive_at_destination(
  p_order_id UUID,
  p_driver_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order delivery_orders%ROWTYPE;
  v_driver_profile_id UUID;
BEGIN
  SELECT * INTO v_order
  FROM delivery_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND', 'error', 'Order not found');
  END IF;

  IF v_order.status != 'on_the_way' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_STATUS', 'error', format('Invalid status: %s. Expected: on_the_way', v_order.status));
  END IF;

  IF v_order.assigned_driver_id IS DISTINCT FROM p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ASSIGNED', 'error', 'You are not the assigned driver for this order');
  END IF;

  SELECT profile_id INTO v_driver_profile_id FROM drivers WHERE id = p_driver_id;

  UPDATE delivery_orders
  SET status = 'driver_arrived_destination',
      driver_arrived_destination_at = now()
  WHERE id = p_order_id;

  INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by)
  VALUES (p_order_id, 'on_the_way', 'driver_arrived_destination', v_driver_profile_id);

  RETURN jsonb_build_object('success', true, 'error', null);
END;
$$;

-- -----------------------------------------
-- 4. RPC: complete_delivery
--    يستخدم 'driver_arrived_destination' في الفحص
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.complete_delivery(
  p_order_id UUID,
  p_driver_id UUID,
  p_verification_method TEXT DEFAULT 'none',
  p_verification_data TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order delivery_orders%ROWTYPE;
  v_driver_profile_id UUID;
  v_now TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_order
  FROM delivery_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND', 'error', 'Order not found');
  END IF;

  IF v_order.status NOT IN ('driver_arrived_destination', 'on_the_way') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_STATUS', 'error', format('Invalid status: %s. Expected: driver_arrived_destination or on_the_way', v_order.status));
  END IF;

  IF v_order.assigned_driver_id IS DISTINCT FROM p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ASSIGNED', 'error', 'You are not the assigned driver for this order');
  END IF;

  IF p_verification_method = 'otp' THEN
    IF v_order.otp_code IS NULL THEN
      RETURN jsonb_build_object('success', false, 'code', 'NO_OTP', 'error', 'No OTP code set for this order');
    END IF;
    IF v_order.otp_expires_at IS NOT NULL AND v_order.otp_expires_at < now() THEN
      RETURN jsonb_build_object('success', false, 'code', 'OTP_EXPIRED', 'error', 'OTP has expired');
    END IF;
    IF v_order.otp_verified_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'code', 'OTP_ALREADY_VERIFIED', 'error', 'OTP already verified');
    END IF;
    IF p_verification_data IS NULL OR p_verification_data != v_order.otp_code THEN
      RETURN jsonb_build_object('success', false, 'code', 'INVALID_OTP', 'error', 'Invalid OTP code');
    END IF;
  END IF;

  v_now := now();
  SELECT profile_id INTO v_driver_profile_id FROM drivers WHERE id = p_driver_id;

  UPDATE delivery_orders
  SET status = 'delivered',
      delivered_at = v_now,
      otp_verified_at = CASE WHEN p_verification_method = 'otp' THEN v_now ELSE otp_verified_at END,
      proof_image_url = CASE WHEN p_verification_method = 'photo' AND p_verification_data IS NOT NULL THEN p_verification_data ELSE proof_image_url END,
      proof_signature_url = CASE WHEN p_verification_method = 'signature' AND p_verification_data IS NOT NULL THEN p_verification_data ELSE proof_signature_url END
  WHERE id = p_order_id;

  INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by)
  VALUES (p_order_id, v_order.status, 'delivered', v_driver_profile_id);

  UPDATE drivers
  SET total_deliveries = total_deliveries + 1
  WHERE id = p_driver_id;

  RETURN jsonb_build_object('success', true, 'error', null);
END;
$$;

-- -----------------------------------------
-- 5. مؤشر جديد يشمل driver_arrived_destination
--    يُنشأ بجانب المؤشر القديم idx_orders_status_active
--    لا يحذف أي مؤشر موجود
-- -----------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_status_active_v2
  ON delivery_orders(status, created_at DESC)
  WHERE status IN (
    'pending', 'published', 'driver_accepted',
    'driver_arrived_store', 'picked_up', 'on_the_way',
    'driver_arrived_destination'
  ) AND deleted_at IS NULL;

-- =============================================
-- التحقق
-- =============================================
DO $$
DECLARE
  has_helper  BOOLEAN;
  has_trigger BOOLEAN;
  has_rpc1    BOOLEAN;
  has_rpc2    BOOLEAN;
  has_index   BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_order_notifications') INTO has_helper;
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_order_status_change') INTO has_trigger;
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'arrive_at_destination') INTO has_rpc1;
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'complete_delivery') INTO has_rpc2;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_status_active_v2') INTO has_index;

  IF has_helper AND has_trigger AND has_rpc1 AND has_rpc2 AND has_index THEN
    RAISE NOTICE 'Migration 050 applied successfully — all 5 components verified';
  ELSE
    RAISE WARNING 'Migration 050 verification: helper=%, trigger=%, rpc1=%, rpc2=%, index=%',
      has_helper, has_trigger, has_rpc1, has_rpc2, has_index;
  END IF;
END $$;