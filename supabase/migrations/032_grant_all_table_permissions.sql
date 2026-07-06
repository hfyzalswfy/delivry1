-- =============================================
-- 032_grant_all_table_permissions.sql
-- إصلاح شامل: جميع الجداول المنشأة عبر migrations
-- تفتقر إلى صلاحيات الأدوار anon و authenticated
-- لأن Supabase default privileges لم تطبق عليها
-- =============================================

-- profiles: (سبق منحها في 029، نضمنها هنا للاكتمال)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.profiles TO anon;

-- stores: (سبق منحها في 031)
GRANT SELECT, INSERT, UPDATE ON public.stores TO authenticated;
GRANT SELECT, INSERT ON public.stores TO anon;

-- store_staff: مطلوب لسياسة stores.read_staff
GRANT SELECT, INSERT, DELETE ON public.store_staff TO authenticated;
GRANT SELECT ON public.store_staff TO anon;

-- customers: (سبق منحها في 031)
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT SELECT, INSERT ON public.customers TO anon;

-- customer_addresses: مطلوب لسياسات customer_addresses
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT SELECT, INSERT ON public.customer_addresses TO anon;

-- drivers: (سبق منحها في 029)
GRANT SELECT, INSERT, UPDATE ON public.drivers TO authenticated;
GRANT SELECT, INSERT ON public.drivers TO anon;

-- driver_documents: مطلوب لسياسات driver_documents
GRANT SELECT, INSERT, UPDATE ON public.driver_documents TO authenticated;
GRANT SELECT, INSERT ON public.driver_documents TO anon;

-- delivery_orders: مطلوب لسياسات الطلبات
GRANT SELECT, INSERT, UPDATE ON public.delivery_orders TO authenticated;
GRANT SELECT, INSERT ON public.delivery_orders TO anon;

-- order_assignments: مطلوب لسياسات التخصيص
GRANT SELECT, INSERT, UPDATE ON public.order_assignments TO authenticated;
GRANT SELECT, INSERT ON public.order_assignments TO anon;

-- order_status_history: للقراءة فقط
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT SELECT ON public.order_status_history TO anon;

-- driver_locations: للإدراج (بث الموقع) والقراءة (التتبع)
GRANT SELECT, INSERT ON public.driver_locations TO authenticated;
GRANT SELECT, INSERT ON public.driver_locations TO anon;

-- conversations, conversation_participants, messages: للدردشة
GRANT SELECT, INSERT ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.conversations TO anon;

GRANT SELECT, INSERT ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT ON public.conversation_participants TO anon;

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT, INSERT ON public.messages TO anon;

-- notifications
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.notifications TO anon;

-- shipment_types, notification_templates: جداول مرجعية (قراءة للجميع)
GRANT SELECT ON public.shipment_types TO authenticated;
GRANT SELECT ON public.shipment_types TO anon;

GRANT SELECT ON public.notification_templates TO authenticated;
GRANT SELECT ON public.notification_templates TO anon;

-- wallets, wallet_transactions
GRANT SELECT, UPDATE ON public.wallets TO authenticated;
GRANT SELECT ON public.wallets TO anon;

GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT SELECT ON public.wallet_transactions TO anon;
