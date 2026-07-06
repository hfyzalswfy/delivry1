-- =============================================
-- 002_base_functions.sql
-- الدوال الأساسية المستخدمة عبر جميع الجداول
-- =============================================

-- -----------------------------------------
-- Trigger Function: تحديث updated_at تلقائياً
-- تُستخدم في BEFORE UPDATE TRIGGER لكل جدول
-- -----------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------
-- Sequence: عداد تصاعدي لترقيم الطلبات
-- استخدامه يمنع مشاكل التزامن (Race Conditions)
-- مقارنة باستخدام MAX() + 1
-- -----------------------------------------
CREATE SEQUENCE IF NOT EXISTS order_number_seq
  START 1
  INCREMENT 1
  CACHE 20;

-- -----------------------------------------
-- Function: توليد رقم طلب فريد
-- الصيغة: ORD-YYYYMMDD-XXXXX
-- مثال:   ORD-20260609-00001
-- -----------------------------------------
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
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
