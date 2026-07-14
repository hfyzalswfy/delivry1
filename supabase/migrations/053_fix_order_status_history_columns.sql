-- =============================================
-- 053_fix_order_status_history_columns.sql
-- يصلح أسماء الأعمدة في order_status_history
-- لتكون متسقة مع الكود
-- =============================================

-- Rename columns to match code conventions (previous_status/new_status)
ALTER TABLE order_status_history RENAME COLUMN from_status TO previous_status;
ALTER TABLE order_status_history RENAME COLUMN to_status TO new_status;

-- Recreate accept_order RPC with corrected column names
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

  SELECT profile_id INTO v_driver_profile_id FROM drivers WHERE id = p_driver_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'DRIVER_NOT_FOUND', 'error', 'Driver not found');
  END IF;

  INSERT INTO order_assignments (order_id, driver_id, status, responded_at)
  VALUES (p_order_id, p_driver_id, 'accepted', now())
  RETURNING id INTO v_assignment_id;

  INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by)
  VALUES (p_order_id, 'pending', 'driver_accepted', v_driver_profile_id);

  RETURN jsonb_build_object('success', true, 'assignment_id', v_assignment_id, 'error', null);
END;
$$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration 053 applied — order_status_history columns renamed, accept_order RPC updated';
END $$;
