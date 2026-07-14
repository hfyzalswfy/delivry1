-- =============================================
-- 056_auto_create_wallets.sql
-- إنشاء المحافظ تلقائياً للمستخدمين الجدد والحاليين
--
-- المشكلة: لا يوجد كود في أي مكان ينشئ سجلات المحافظ.
-- جدول wallets موجود لكنه فارغ ما لم يُملأ يدوياً.
-- هذا يسبب خطأ "Wallet not found or frozen" عند
-- محاولة إتمام التوصيل.
--
-- الحل:
--   1. دالة trigger تنشئ محفظة تلقائياً عند إنشاء حساب
--   2. trigger على profiles: AFTER INSERT
--   3. تعبئة رجعية للمستخدمين الحاليين
-- =============================================

-- -----------------------------------------
-- 1. دالة trigger: create_wallet_for_new_profile
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.create_wallet_for_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO wallets (profile_id, balance, currency, is_frozen)
  VALUES (NEW.id, 0.00, 'SAR', false);
  RETURN NEW;
END;
$$;

-- -----------------------------------------
-- 2. Trigger على profiles
-- -----------------------------------------
DROP TRIGGER IF EXISTS trg_create_wallet_on_profile_insert ON profiles;

CREATE TRIGGER trg_create_wallet_on_profile_insert
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_wallet_for_new_profile();

-- -----------------------------------------
-- 3. تعبئة رجعية: إنشاء محافظ للمستخدمين الحاليين
-- -----------------------------------------
INSERT INTO wallets (profile_id, balance, currency, is_frozen)
SELECT p.id, 0.00, 'SAR', false
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM wallets w WHERE w.profile_id = p.id)
  AND p.deleted_at IS NULL;

-- Verification
DO $$
DECLARE
  v_profile_count INTEGER;
  v_wallet_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_profile_count FROM profiles WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_wallet_count FROM wallets;

  RAISE NOTICE 'Profiles without wallets before backfill: %', v_profile_count - v_wallet_count;

  IF v_profile_count = v_wallet_count THEN
    RAISE NOTICE 'Migration 056 applied — all % profiles now have wallets', v_profile_count;
  ELSE
    RAISE WARNING 'Migration 056: % profiles, % wallets — mismatch!', v_profile_count, v_wallet_count;
  END IF;
END $$;
