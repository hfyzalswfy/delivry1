-- =============================================
-- 058_realtime_publication_tables.sql
-- إضافة الجداول المطلوبة إلى supabase_realtime
--
-- حالياً فقط chat tables (messages, conversations,
-- conversation_participants) مضمنة في النشر.
--
-- بدون هذه الجداول، جميع اشتراكات postgres_changes
-- لهذه الجداول ستفشل صامتاً.
--
-- الجداول المضافة:
--   delivery_orders    — تحديثات حالة الطلب
--   drivers            — تحديثات موقع السائق
--   notifications      — الإشعارات الفورية
--   wallet_transactions— تحديثات المحفظة
--   order_status_history— سجل الحالات (للمراقبة)
--   driver_locations   — تتبع المواقع (للمراقبة)
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- delivery_orders
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'delivery_orders'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_orders;
      RAISE NOTICE 'Added delivery_orders to supabase_realtime';
    ELSE
      RAISE NOTICE 'delivery_orders already in supabase_realtime';
    END IF;

    -- drivers
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'drivers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
      RAISE NOTICE 'Added drivers to supabase_realtime';
    ELSE
      RAISE NOTICE 'drivers already in supabase_realtime';
    END IF;

    -- notifications
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
      RAISE NOTICE 'Added notifications to supabase_realtime';
    ELSE
      RAISE NOTICE 'notifications already in supabase_realtime';
    END IF;

    -- wallet_transactions
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wallet_transactions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
      RAISE NOTICE 'Added wallet_transactions to supabase_realtime';
    ELSE
      RAISE NOTICE 'wallet_transactions already in supabase_realtime';
    END IF;

    -- order_status_history (للمراقبة)
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_status_history'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
      RAISE NOTICE 'Added order_status_history to supabase_realtime';
    ELSE
      RAISE NOTICE 'order_status_history already in supabase_realtime';
    END IF;

    -- driver_locations (للمراقبة والتتبع الحي)
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'driver_locations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
      RAISE NOTICE 'Added driver_locations to supabase_realtime';
    ELSE
      RAISE NOTICE 'driver_locations already in supabase_realtime';
    END IF;

  ELSE
    RAISE WARNING 'Publication supabase_realtime does not exist — skipping realtime table additions';
  END IF;
END $$;

-- تعيين REPLICA IDENTITY FULL للجداول التي نحتاج
-- بيانات كاملة في payload (p.new)
ALTER TABLE delivery_orders REPLICA IDENTITY FULL;
ALTER TABLE drivers REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Verification
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public';

  RAISE NOTICE 'Migration 058 applied — supabase_realtime now contains % tables', v_count;
END $$;
