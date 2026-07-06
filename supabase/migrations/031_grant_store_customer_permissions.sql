-- =============================================
-- 031_grant_store_customer_permissions.sql
-- إصلاح: إضافة صلاحيات مفقودة لـ stores و customers
-- نفس مشكلة 029: دور authenticated ليس لديه SELECT/INSERT
-- =============================================

-- stores: للقراءة (إنشاء طلب) والإدراج (إعداد المتجر)
GRANT SELECT, INSERT, UPDATE ON public.stores TO authenticated;
GRANT SELECT, INSERT ON public.stores TO anon;

-- customers: للقراءة والإدراج (إعداد العميل)
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT SELECT, INSERT ON public.customers TO anon;
