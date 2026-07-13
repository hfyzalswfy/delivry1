-- =============================================
-- 049_add_delivery_completion.sql
-- يدعم شاشات إتمام التوصيل:
--   1. Active Delivery Map (driver_arrived_destination)
--   2. Confirm Delivery (التحقق + الإكمال)
--   3. Report Delivery Issue (مشاكل التوصيل)
--   4. Delivery Summary (عرض الملخص)
--
-- التغييرات (Additive فقط):
--   1. حالة جديدة: driver_arrived_destination
--   2. أعمدة جديدة: driver_arrived_destination_at, proof_signature_url
--   3. enum جديد: delivery_issue_type + delivery_issues (جدول)
--   4. RPC: report_delivery_issue (لا يشير إلى القيمة الجديدة)
--
-- جميع الدوال التي تشير إلى driver_arrived_destination
-- موجودة في 050_finalize_driver_arrived_destination.sql
-- =============================================

-- -----------------------------------------
-- 1. إضافة حالة وصول السائق إلى وجهة التوصيل
-- -----------------------------------------
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'driver_arrived_destination';

-- -----------------------------------------
-- 2. أعمدة جديدة في delivery_orders
-- -----------------------------------------
ALTER TABLE delivery_orders
  ADD COLUMN IF NOT EXISTS driver_arrived_destination_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proof_signature_url TEXT;

COMMENT ON COLUMN delivery_orders.driver_arrived_destination_at
  IS 'وقت وصول السائق إلى وجهة التوصيل';
COMMENT ON COLUMN delivery_orders.proof_signature_url
  IS 'رابط تخزين توقيع العميل (متوافق مع Supabase Storage)';

-- -----------------------------------------
-- 3. enum + جدول مشاكل التوصيل
-- -----------------------------------------
DO $$ BEGIN
  CREATE TYPE delivery_issue_type AS ENUM (
    'customer_unavailable',
    'wrong_address',
    'customer_refused',
    'store_issue',
    'vehicle_issue',
    'emergency',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS delivery_issues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  issue_type  delivery_issue_type NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_delivery_issues_order ON delivery_issues(order_id);

COMMENT ON TABLE delivery_issues IS 'تتبع مشاكل التوصيل التي يبلغ عنها السائقون';

-- -----------------------------------------
-- 4. RPC: report_delivery_issue
--    (لا يشير إلى driver_arrived_destination)
--    يُنشئ سجل مشكلة توصيل دون تغيير حالة الطلب
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.report_delivery_issue(
  p_order_id UUID,
  p_driver_id UUID,
  p_issue_type delivery_issue_type,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order delivery_orders%ROWTYPE;
  v_issue_id UUID;
BEGIN
  SELECT * INTO v_order
  FROM delivery_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ORDER_NOT_FOUND', 'error', 'Order not found');
  END IF;

  IF v_order.assigned_driver_id IS DISTINCT FROM p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_ASSIGNED', 'error', 'You are not the assigned driver for this order');
  END IF;

  INSERT INTO delivery_issues (order_id, driver_id, issue_type, description)
  VALUES (p_order_id, p_driver_id, p_issue_type, p_description)
  RETURNING id INTO v_issue_id;

  RETURN jsonb_build_object('success', true, 'issue_id', v_issue_id, 'error', null);
END;
$$;

-- =============================================
-- التحقق: يتأكد من وجود العناصر الجديدة فقط
-- (لا يتحقق من الدوال التي تشير إلى القيمة الجديدة)
-- =============================================
DO $$
DECLARE
  has_status  BOOLEAN;
  has_column1 BOOLEAN;
  has_column2 BOOLEAN;
  has_table   BOOLEAN;
  has_enum    BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'driver_arrived_destination') INTO has_status;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_orders' AND column_name = 'driver_arrived_destination_at') INTO has_column1;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_orders' AND column_name = 'proof_signature_url') INTO has_column2;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_issues') INTO has_table;
  SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_issue_type') INTO has_enum;

  IF has_status AND has_column1 AND has_column2 AND has_table AND has_enum THEN
    RAISE NOTICE 'Migration 049 applied successfully — all 5 components verified';
  ELSE
    RAISE WARNING 'Migration 049 verification: status=%, col1=%, col2=%, table=%, enum=%',
      has_status, has_column1, has_column2, has_table, has_enum;
  END IF;
END $$;