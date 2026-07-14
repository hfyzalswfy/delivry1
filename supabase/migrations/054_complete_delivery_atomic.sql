-- =============================================
-- 054_complete_delivery_atomic.sql
-- يجعل complete_delivery ذرياً مع إضافة:
--   1. إيداع رصيد المحفظة
--   2. تسجيل حركة مالية (wallet_transactions)
--   3. تحديث إحصائيات السائق
--   4. التعامل مع الحالة "delivered" بأمان
-- =============================================

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
  v_wallet_id UUID;
  v_now TIMESTAMPTZ;
  v_earnings DECIMAL(12,2);
  v_bonus DECIMAL(12,2);
  v_total DECIMAL(12,2);
  v_tx_id UUID;
BEGIN
  -- قفل الطلب لمنع السباق
  SELECT * INTO v_order
  FROM delivery_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND', 'error', 'Order not found');
  END IF;

  -- إذا كان الطلب قد تم توصيله بالفعل، نرجع نجاحاً دون تغيير
  IF v_order.status = 'delivered' THEN
    RETURN jsonb_build_object('success', true, 'code', 'ALREADY_DELIVERED', 'error', null);
  END IF;

  -- التحقق من الحالة الصحيحة
  IF v_order.status NOT IN ('driver_arrived_destination', 'on_the_way') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_STATUS', 'error', format('Invalid status: %s. Expected: driver_arrived_destination or on_the_way', v_order.status));
  END IF;

  -- التحقق من أن السائق هو المسؤول عن الطلب
  IF v_order.assigned_driver_id IS DISTINCT FROM p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ASSIGNED', 'error', 'You are not the assigned driver for this order');
  END IF;

  -- التحقق من OTP
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

  -- الحصول على معرف المحفظة وقفلها (نفس المعاملة)
  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE profile_id = v_driver_profile_id AND is_frozen = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'NO_WALLET', 'error', 'Driver wallet not found or frozen');
  END IF;

  -- حساب المبالغ
  v_earnings := COALESCE(v_order.driver_earnings, 0);
  v_bonus := COALESCE(v_order.reward_bonus, 0);
  v_total := v_earnings + v_bonus;

  -- 1. تحديث حالة الطلب
  UPDATE delivery_orders
  SET status = 'delivered',
      delivered_at = v_now,
      otp_verified_at = CASE WHEN p_verification_method = 'otp' THEN v_now ELSE otp_verified_at END,
      proof_image_url = CASE WHEN p_verification_method = 'photo' AND p_verification_data IS NOT NULL THEN p_verification_data ELSE proof_image_url END,
      proof_signature_url = CASE WHEN p_verification_method = 'signature' AND p_verification_data IS NOT NULL THEN p_verification_data ELSE proof_signature_url END
  WHERE id = p_order_id;

  -- 2. تسجيل تاريخ الحالة
  INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by)
  VALUES (p_order_id, v_order.status, 'delivered', v_driver_profile_id);

  -- 3. إضافة رصيد المحفظة (تستخدم SELECT FOR UPDATE داخلياً)
  IF v_total > 0 THEN
    v_tx_id := add_wallet_transaction(
      v_wallet_id,
      v_total,
      'deposit',
      format('Delivery earnings for order %s', v_order.order_number),
      'order',
      p_order_id
    );
  END IF;

  -- 4. تحديث إحصائيات السائق
  UPDATE drivers
  SET total_deliveries = total_deliveries + 1
  WHERE id = p_driver_id;

  RETURN jsonb_build_object(
    'success', true,
    'error', null,
    'transaction_id', v_tx_id,
    'amount', v_total
  );
END;
$$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration 054 applied — complete_delivery is now atomic with wallet credit';
END $$;
