-- =============================================
-- 036_fix_sync_trigger_security_definer.sql
-- إصلاح: trigger sync_assigned_driver لا يعمل 
--        لأنه كان SECURITY INVOKER وليس SECURITY DEFINER
--
-- السبب: السائق لا يملك UPDATE على delivery_orders
--        قبل تعيين assigned_driver_id
--        trigger يحاول UPDATE لكن RLS يمنع
--
-- الحل: تحويل الدالة إلى SECURITY DEFINER
--        (نفس نهج 026 + 030 + 034)
--
-- بالإضافة إلى:
--   دالة find_customer_by_phone() للبحث عن العملاء
--   بدون التصادم مع RLS
-- =============================================

-- -----------------------------------------
-- 1. تحويل sync_assigned_driver إلى SECURITY DEFINER
-- -----------------------------------------
CREATE OR REPLACE FUNCTION sync_assigned_driver()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' THEN
    UPDATE delivery_orders
    SET assigned_driver_id    = NEW.driver_id,
        assigned_at           = NEW.responded_at,
        status                = 'driver_accepted',
        driver_accepted_at    = NEW.responded_at
    WHERE id = NEW.order_id
      AND status = 'pending';

    IF FOUND THEN
      UPDATE order_assignments
      SET status = 'expired'
      WHERE order_id = NEW.order_id
        AND id != NEW.id
        AND status = 'pending';
    ELSE
      UPDATE order_assignments
      SET status = 'expired'
      WHERE id = NEW.id AND status = 'pending';
    END IF;

  ELSIF NEW.status IN ('rejected', 'expired') THEN
    NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------
-- 2. دالة find_customer_by_phone
--    تسمح للمتجر بالبحث عن عميل بواسطة رقم الهاتف
--    تعمل بـ SECURITY DEFINER لتجاوز RLS
--    ترجع UUID فقط (ليس بيانات كاملة)
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.find_customer_by_phone(p_phone TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.customers
  WHERE phone = p_phone AND deleted_at IS NULL
  LIMIT 1;
$$;

-- -----------------------------------------
-- 3. التحقق: تأكيد أن الدوال تعمل بشكل صحيح
-- -----------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname IN ('sync_assigned_driver', 'find_customer_by_phone')
      AND n.nspname = 'public'
      AND p.prosecdef = true
    HAVING COUNT(*) = 2
  ) THEN
    RAISE NOTICE 'Both functions are SECURITY DEFINER (verified)';
  ELSE
    RAISE WARNING 'Not all functions are SECURITY DEFINER';
  END IF;
END;
$$;
