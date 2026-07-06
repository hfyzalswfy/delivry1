-- =============================================
-- 016_wallet_transactions.sql
-- حركات المحفظة المالية
-- ودالة add_wallet_transaction() (ACID-safe)
-- =============================================

-- -----------------------------------------
-- جدول: wallet_transactions
-- سجل جميع الحركات المالية
-- -----------------------------------------
CREATE TABLE wallet_transactions (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id      UUID          NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount         DECIMAL(12,2) NOT NULL,
  type           TEXT          NOT NULL,
  description    TEXT,
  reference_type TEXT,
  reference_id   UUID,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT chk_amount_non_zero CHECK (amount != 0)
);

COMMENT ON COLUMN wallet_transactions.amount IS
  'موجب (+) = إيداع، سالب (-) = سحب. لا يمكن أن يكون صفراً.';

COMMENT ON COLUMN wallet_transactions.type IS
  'أنواع الحركات: deposit, withdrawal, order_payment, commission, refund, payout';

COMMENT ON COLUMN wallet_transactions.reference_type IS
  'نوع المرجع المرتبط: order, dispute, payout';

COMMENT ON COLUMN wallet_transactions.reference_id IS
  'المعرف الفريد للكيان المرتبط (UUID)';

CREATE INDEX idx_wallet_transactions_wallet
  ON wallet_transactions(wallet_id, created_at DESC);

-- -----------------------------------------
-- دالة: add_wallet_transaction
-- تضيف حركة مالية وتحدث رصيد المحفظة
-- باستخدام SELECT FOR UPDATE (ضمان ACID)
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
AS $$
DECLARE
  v_transaction_id UUID;
  v_balance        DECIMAL(12,2);
BEGIN
  -- قفل صف المحفظة (يمنع Race Conditions بين المعاملات المتزامنة)
  SELECT balance INTO v_balance
  FROM wallets
  WHERE id = p_wallet_id AND is_frozen = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found or frozen (wallet_id: %)', p_wallet_id;
  END IF;

  -- التحقق من كفاية الرصيد للسحب
  IF p_amount < 0 AND (v_balance + p_amount) < 0 THEN
    RAISE EXCEPTION 'Insufficient balance (available: %, required: %)',
      v_balance, ABS(p_amount);
  END IF;

  -- إنشاء الحركة
  INSERT INTO wallet_transactions (
    wallet_id, amount, type, description, reference_type, reference_id
  ) VALUES (
    p_wallet_id, p_amount, p_type, p_description, p_reference_type, p_reference_id
  ) RETURNING id INTO v_transaction_id;

  -- تحديث الرصيد (نفس المعاملة = Atomic)
  UPDATE wallets
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE id = p_wallet_id;

  RETURN v_transaction_id;
END;
$$;

COMMENT ON FUNCTION add_wallet_transaction IS
  'إضافة حركة مالية مع تحديث الرصيد.
   - مبلغ موجب = إيداع، سالب = سحب.
   - ترفض إذا كانت المحفظة مجمدة (is_frozen = true).
   - ترفض السحب إذا كان الرصيد غير كافٍ.
   - تستخدم SELECT FOR UPDATE لمنافعة التوافقية.';
