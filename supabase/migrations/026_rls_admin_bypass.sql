-- =============================================
-- 026_rls_admin_bypass.sql
-- دوال SECURITY DEFINER لتجاوز RLS عند الحاجة
-- =============================================

-- -----------------------------------------
-- تحديث add_wallet_transaction() إلى SECURITY DEFINER
-- لتتمكن من تعديل wallets و wallet_transactions
-- رغم تفعيل RLS عليهما
-- -----------------------------------------
CREATE OR REPLACE FUNCTION add_wallet_transaction(
  p_wallet_id   UUID,
  p_amount      DECIMAL(12,2),
  p_type        TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id   UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_balance        DECIMAL(12,2);
BEGIN
  SELECT balance INTO v_balance
  FROM wallets
  WHERE id = p_wallet_id AND is_frozen = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found or frozen (wallet_id: %)', p_wallet_id;
  END IF;

  IF p_amount < 0 AND (v_balance + p_amount) < 0 THEN
    RAISE EXCEPTION 'Insufficient balance (available: %, required: %)',
      v_balance, ABS(p_amount);
  END IF;

  INSERT INTO wallet_transactions (
    wallet_id, amount, type, description, reference_type, reference_id
  ) VALUES (
    p_wallet_id, p_amount, p_type, p_description, p_reference_type, p_reference_id
  ) RETURNING id INTO v_transaction_id;

  UPDATE wallets
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE id = p_wallet_id;

  RETURN v_transaction_id;
END;
$$;

-- -----------------------------------------
-- دالة مساعدة: admin_soft_delete_user()
-- تسمح للمدير بتعطيل أي مستخدم
-- -----------------------------------------
CREATE OR REPLACE FUNCTION admin_soft_delete_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can soft-delete users';
  END IF;

  UPDATE profiles
  SET deleted_at = now(), is_active = false
  WHERE id = p_user_id AND deleted_at IS NULL;
END;
$$;

-- -----------------------------------------
-- دالة مساعدة: admin_restore_user()
-- -----------------------------------------
CREATE OR REPLACE FUNCTION admin_restore_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin can restore users';
  END IF;

  UPDATE profiles
  SET deleted_at = NULL, is_active = true
  WHERE id = p_user_id;
END;
$$;
