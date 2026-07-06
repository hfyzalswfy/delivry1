-- =============================================
-- 015_wallets.sql
-- محافظ المستخدمين (السائقين + المتاجر)
-- محفظة واحدة لكل مستخدم
-- =============================================

CREATE TABLE wallets (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID          NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  balance    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency   TEXT          NOT NULL DEFAULT 'SAR',
  is_frozen  BOOLEAN       NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON COLUMN wallets.balance IS
  'الرصيد الحالي. يساوي دائماً SUM(wallet_transactions.amount).';

COMMENT ON COLUMN wallets.is_frozen IS
  'عند التجميد، تمنع add_wallet_transaction() أي حركة على المحفظة.';

CREATE INDEX idx_wallets_profile ON wallets(profile_id);
