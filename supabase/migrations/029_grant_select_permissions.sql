-- =============================================
-- 029_grant_select_permissions.sql
-- إصلاح: إضافة SELECT المفقود لدور authenticated
-- الخطأ السابق في 028: GRANT INSERT, UPDATE فقط
-- لكن SELECT كان مفقوداً → login يفشل
-- =============================================

-- profiles: SELECT ضروري لقراءة الملف بعد تسجيل الدخول
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- drivers: SELECT ضروري للتحقق من إعداد السائق
GRANT SELECT ON public.drivers TO authenticated;
GRANT SELECT ON public.drivers TO anon;
