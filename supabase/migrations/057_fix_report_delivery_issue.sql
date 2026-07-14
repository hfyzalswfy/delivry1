-- =============================================
-- 057_fix_report_delivery_issue.sql
-- إصلاح تدفق الإبلاغ عن المشاكل
--
-- المشاكل الحالية:
--   1. لا يوجد قفل للطلب (SELECT ... FOR UPDATE)
--   2. لا يتم تسجيل history
--   3. لا يتم إنشاء إشعارات
--   4. لا يتم إعلام المشرف
--   5. لا يتم إعلام المتجر
--
-- الحل: إعادة كتابة RPC مع إضافة كل الخطوات
-- =============================================

CREATE OR REPLACE FUNCTION public.report_delivery_issue(
  p_order_id UUID,
  p_driver_id UUID,
  p_issue_type delivery_issue_type,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order delivery_orders%ROWTYPE;
  v_issue_id UUID;
  v_driver_profile_id UUID;
  v_driver_name TEXT;
  v_store_owner_id UUID;
  v_admin_ids UUID[];
  v_admin_id UUID;
BEGIN
  -- 1. قفل الطلب لمنع السباق
  SELECT * INTO v_order
  FROM delivery_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND', 'error', 'Order not found');
  END IF;

  IF v_order.assigned_driver_id IS DISTINCT FROM p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ASSIGNED', 'error', 'You are not the assigned driver for this order');
  END IF;

  -- 2. الحصول على بيانات السائق والمتجر
  SELECT d.profile_id INTO v_driver_profile_id FROM drivers d WHERE d.id = p_driver_id;
  SELECT p.full_name INTO v_driver_name FROM profiles p WHERE p.id = v_driver_profile_id;

  SELECT s.owner_id INTO v_store_owner_id FROM stores s WHERE s.id = v_order.store_id;

  -- 3. إنشاء سجل المشكلة
  INSERT INTO delivery_issues (order_id, driver_id, issue_type, description)
  VALUES (p_order_id, p_driver_id, p_issue_type, p_description)
  RETURNING id INTO v_issue_id;

  -- 4. تسجيل في order_status_history
  INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes)
  VALUES (p_order_id, v_order.status, v_order.status, v_driver_profile_id,
    format('Issue reported: %s%s', p_issue_type, CASE WHEN p_description IS NOT NULL THEN format(' — %s', p_description) ELSE '' END));

  -- 5. إشعار للسائق (تأكيد)
  INSERT INTO notifications (profile_id, notification_type, title, body, data)
  VALUES (v_driver_profile_id, 'order_update', 'Issue Reported',
    format('Your issue for order %s has been recorded. We will review it shortly.', v_order.order_number),
    jsonb_build_object('order_id', p_order_id, 'issue_id', v_issue_id, 'issue_type', p_issue_type));

  -- 6. إشعار لصاحب المتجر
  IF v_store_owner_id IS NOT NULL THEN
    INSERT INTO notifications (profile_id, notification_type, title, body, data)
    VALUES (v_store_owner_id, 'order_update', 'Delivery Issue Reported',
      format('A delivery issue has been reported for order %s by driver %s. Issue: %s', v_order.order_number, v_driver_name, p_issue_type),
      jsonb_build_object('order_id', p_order_id, 'issue_id', v_issue_id, 'issue_type', p_issue_type));
  END IF;

  -- 7. إشعار للمشرفين
  FOR v_admin_id IN
    SELECT p.id FROM profiles p WHERE p.role = 'admin' AND p.deleted_at IS NULL
  LOOP
    INSERT INTO notifications (profile_id, notification_type, title, body, data)
    VALUES (v_admin_id, 'complaint_update', 'Delivery Issue Requires Review',
      format('Driver %s reported an issue for order %s. Type: %s. Description: %s',
        v_driver_name, v_order.order_number, p_issue_type, COALESCE(p_description, 'No details provided')),
      jsonb_build_object('order_id', p_order_id, 'issue_id', v_issue_id, 'issue_type', p_issue_type, 'driver_id', p_driver_id));
  END LOOP;

  RETURN jsonb_build_object('success', true, 'issue_id', v_issue_id, 'error', null);
END;
$$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration 057 applied — report_delivery_issue now includes history, notifications, and admin alerts';
END $$;
