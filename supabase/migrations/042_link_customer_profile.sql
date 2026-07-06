-- =============================================
-- 042_link_customer_profile.sql
-- الربط التلقائي لملف العميل الجديد بسجل العميل الحالي
-- عند إنشاء حساب أو تحديث رقم الهاتف
-- =============================================

-- -----------------------------------------
-- 1. دالة Trigger: ربط profile → customer
--    عند إنشاء profile جديد بدور customer
--    أو تحديث رقم الهاتف
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.link_customer_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.customers
  SET profile_id = NEW.id
  WHERE phone = NEW.phone
    AND profile_id IS NULL
    AND NEW.role = 'customer';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_customer_profile ON public.profiles;

CREATE TRIGGER trg_link_customer_profile
  AFTER INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'customer')
  EXECUTE FUNCTION public.link_customer_profile();

-- -----------------------------------------
-- 2. تحديث دالة link_customer_orders
--    لإضافة العميل إلى المحادثات الحالية
--    بعد ربط profile_id
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.link_customer_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  -- ربط الطلبات القديمة التي لها نفس رقم الهاتف
  UPDATE public.delivery_orders
  SET customer_id = NEW.id
  WHERE customer_phone = NEW.phone
    AND customer_id IS NULL;

  -- إضافة العميل إلى المحادثات الموجودة
  FOR v_conv_id IN
    SELECT c.id
    FROM conversations c
    JOIN delivery_orders do2 ON do2.id = c.order_id
    WHERE do2.customer_phone = NEW.phone
      AND NOT EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = c.id
          AND cp.profile_id = NEW.profile_id
      )
  LOOP
    INSERT INTO conversation_participants (conversation_id, profile_id, participant_role)
    VALUES (v_conv_id, NEW.profile_id, 'customer')
    ON CONFLICT (conversation_id, profile_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- -----------------------------------------
-- 3. التحقق
-- -----------------------------------------
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_link_customer_profile'
  ), 'Trigger trg_link_customer_profile was not created';
  RAISE NOTICE 'Migration 042 applied successfully';
END $$;
