-- =============================================
-- 033_fix_order_number_sequence.sql
-- إصلاح: permission denied for sequence order_number_seq
--
-- السبب الجذري:
--   delivery_orders.order_number DEFAULT generate_order_number()
--   → generate_order_number() هي SECURITY INVOKER
--   → nextval('order_number_seq') يُنفذ بصلاحيات المستخدم (authenticated)
--   → لا يوجد GRANT USAGE ON SEQUENCE للمستخدم
--     → permission denied
--
-- الحل:
--   1. تحويل الدالة إلى SECURITY DEFINER (تُنفذ بصلاحيات مالكها = postgres)
--      مع SET search_path = public لمنع SQL injection عبر search_path
--   2. GRANT USAGE, SELECT احتياطي على الـ sequence
-- =============================================

-- -----------------------------------------
-- 1. التحقق من مالك الـ sequence
-- -----------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'order_number_seq'
      AND n.nspname = 'public'
      AND c.relowner = (SELECT usesysid FROM pg_user WHERE usename = 'postgres')
  ) THEN
    RAISE WARNING 'order_number_seq owner is not postgres - verify before continuing';
  ELSE
    RAISE NOTICE 'order_number_seq owner: postgres (correct)';
  END IF;
END;
$$;

-- -----------------------------------------
-- 2. إعادة إنشاء الدالة بـ SECURITY DEFINER
--    SET search_path = public يمنع SQL injection
--    حيث لا يمكن للمستخدم التحكم بمسارات البحث
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  date_part TEXT;
  seq_num   BIGINT;
BEGIN
  date_part := to_char(now(), 'YYYYMMDD');
  seq_num   := nextval('order_number_seq');
  RETURN 'ORD-' || date_part || '-' || LPAD(seq_num::TEXT, 5, '0');
END;
$$;

-- -----------------------------------------
-- 3. GRANT احتياطي: صلاحية استخدام الـ sequence
--    ضروري لو استخدم أي كود آخر nextval مباشرة
--    أو إذا تغير تعريف الدالة مستقبلاً
-- -----------------------------------------
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO anon;

-- -----------------------------------------
-- 4. التحقق: تأكيد أن الدالة أصبحت SECURITY DEFINER
-- -----------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'generate_order_number'
      AND n.nspname = 'public'
      AND p.prosecdef = true
  ) THEN
    RAISE NOTICE 'generate_order_number() is now SECURITY DEFINER (verified)';
  ELSE
    RAISE WARNING 'generate_order_number() is still SECURITY INVOKER - check migration';
  END IF;
END;
$$;

-- -----------------------------------------
-- 5. التحقق: تأكيد أن GRANT تم تطبيقه
-- -----------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.role_usage_grants
    WHERE object_name = 'order_number_seq'
      AND object_schema = 'public'
      AND object_type = 'SEQUENCE'
      AND grantee IN ('authenticated', 'postgres')
  ) THEN
    RAISE NOTICE 'GRANT USAGE on order_number_seq verified for authenticated';
  ELSE
    RAISE WARNING 'GRANT USAGE on order_number_seq not found - check migration';
  END IF;
END;
$$;
