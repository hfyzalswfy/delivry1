-- =============================================
-- 028_grant_table_permissions.sql
-- إصلاح: إضافة صلاحيات مفقودة على مستوى الجدول
-- الخطأ: permission denied for table profiles (42501)
-- السبب: دور authenticated ليس لديه INSERT/UPDATE
-- على بعض الجداول لأن default privileges لم تطبق
-- =============================================

-- profiles: للقراءة (تسجيل الدخول) والإدراج (التسجيل) والتحديث
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.profiles TO anon;

-- drivers: للقراءة (تسجيل الدخول) والإدراج (إعداد السائق) والتحديث
GRANT SELECT, INSERT, UPDATE ON public.drivers TO authenticated;
GRANT SELECT, INSERT ON public.drivers TO anon;
