-- =============================================
-- 055_create_lifecycle_rpcs.sql
-- تكملة دورة حياة الطلب — RPCs ناقصة:
--   1. arrive_at_store   (driver_accepted → driver_arrived_store)
--   2. confirm_pickup    (driver_arrived_store → picked_up)
--   3. start_delivery    (picked_up → on_the_way)
--
-- ملاحظة: هذه الاستدعاءات تستبدل
--   التحديثات المباشرة في pickup-confirmation.tsx و en-route.tsx
-- =============================================

-- -----------------------------------------
-- 1. RPC: arrive_at_store
--    ينتقل من driver_accepted → driver_arrived_store
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.arrive_at_store(
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

  IF v_order.status != 'driver_accepted' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_STATUS', 'error', format('Invalid status: %s. Expected: driver_accepted', v_order.status));
  END IF;

  IF v_order.assigned_driver_id IS DISTINCT FROM p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ASSIGNED', 'error', 'You are not the assigned driver for this order');
  END IF;

  SELECT profile_id INTO v_driver_profile_id FROM drivers WHERE id = p_driver_id;

  UPDATE delivery_orders
  SET status = 'driver_arrived_store',
      driver_arrived_store_at = now()
  WHERE id = p_order_id;

  INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by)
  VALUES (p_order_id, 'driver_accepted', 'driver_arrived_store', v_driver_profile_id);

  RETURN jsonb_build_object('success', true, 'error', null);
END;
$$;

-- -----------------------------------------
-- 2. RPC: confirm_pickup
--    ينتقل من driver_arrived_store → picked_up
--    مع صورة الإثبات والملاحظات
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_pickup(
  p_order_id UUID,
  p_driver_id UUID,
  p_proof_image_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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

  IF v_order.status != 'driver_arrived_store' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_STATUS', 'error', format('Invalid status: %s. Expected: driver_arrived_store', v_order.status));
  END IF;

  IF v_order.assigned_driver_id IS DISTINCT FROM p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ASSIGNED', 'error', 'You are not the assigned driver for this order');
  END IF;

  SELECT profile_id INTO v_driver_profile_id FROM drivers WHERE id = p_driver_id;

  UPDATE delivery_orders
  SET status = 'picked_up',
      picked_up_at = now(),
      proof_image_url = COALESCE(p_proof_image_url, proof_image_url)
  WHERE id = p_order_id;

  INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes)
  VALUES (p_order_id, 'driver_arrived_store', 'picked_up', v_driver_profile_id, p_notes);

  RETURN jsonb_build_object('success', true, 'error', null);
END;
$$;

-- -----------------------------------------
-- 3. RPC: start_delivery
--    ينتقل من picked_up → on_the_way
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.start_delivery(
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

  IF v_order.status != 'picked_up' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_STATUS', 'error', format('Invalid status: %s. Expected: picked_up', v_order.status));
  END IF;

  IF v_order.assigned_driver_id IS DISTINCT FROM p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ASSIGNED', 'error', 'You are not the assigned driver for this order');
  END IF;

  SELECT profile_id INTO v_driver_profile_id FROM drivers WHERE id = p_driver_id;

  UPDATE delivery_orders
  SET status = 'on_the_way',
      on_the_way_at = now()
  WHERE id = p_order_id;

  INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by)
  VALUES (p_order_id, 'picked_up', 'on_the_way', v_driver_profile_id);

  RETURN jsonb_build_object('success', true, 'error', null);
END;
$$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration 055 applied — arrive_at_store, confirm_pickup, start_delivery RPCs created';
END $$;
