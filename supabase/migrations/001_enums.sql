-- =============================================
-- 001_enums.sql
-- أنواع البيانات المخصصة (Custom Enums)
-- متوافق مع Supabase PostgreSQL
-- =============================================

-- أدوار المستخدمين في النظام
CREATE TYPE user_role AS ENUM (
  'customer',
  'driver',
  'store',
  'admin'
);

-- دورة حياة طلب التوصيل الكاملة
CREATE TYPE order_status AS ENUM (
  'pending',              -- قيد الانتظار (لم ينشر بعد)
  'published',            -- منشور للسائقين
  'driver_accepted',      -- تم قبول السائق
  'driver_arrived_store', -- وصل السائق للمتجر
  'picked_up',            -- تم الاستلام من المتجر
  'on_the_way',           -- في الطريق للعميل
  'delivered',            -- تم التوصيل
  'cancelled'             -- ملغي
);

-- حالة توفر السائق
CREATE TYPE driver_availability AS ENUM (
  'online',
  'offline',
  'busy'
);

-- حالة تخصيص الطلب لسائق
CREATE TYPE assignment_status AS ENUM (
  'pending',   -- في انتظار رد السائق
  'accepted',  -- قبل السائق
  'rejected',  -- رفض السائق
  'expired'    -- انتهت المهلة أو ألغي بسبب قبول سائق آخر
);

-- أولوية الطلب
CREATE TYPE order_priority AS ENUM (
  'normal',
  'express'
);

-- حالة مستندات التحقق من السائق
CREATE TYPE document_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- طريقة الدفع
CREATE TYPE payment_method AS ENUM (
  'cash',
  'card',
  'wallet'
);
