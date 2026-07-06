-- =============================================
-- 008_delivery_orders.sql
-- جدول طلبات التوصيل (الجدول الرئيسي)
-- =============================================

-- -----------------------------------------
-- المرحلة 1: الهيكل الأساسي والعلاقات
-- -----------------------------------------
CREATE TABLE delivery_orders (
  id           UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT   NOT NULL UNIQUE DEFAULT generate_order_number(),

  store_id     UUID   NOT NULL REFERENCES stores(id)    ON DELETE RESTRICT,
  created_by   UUID   NOT NULL REFERENCES profiles(id)  ON DELETE RESTRICT,
  customer_id             UUID            REFERENCES customers(id)          ON DELETE RESTRICT,

  CONSTRAINT chk_pickup_latitude   CHECK (pickup_latitude   BETWEEN -90  AND 90),
  CONSTRAINT chk_pickup_longitude  CHECK (pickup_longitude  BETWEEN -180 AND 180),
  CONSTRAINT chk_delivery_latitude  CHECK (delivery_latitude  BETWEEN -90  AND 90),
  CONSTRAINT chk_delivery_longitude CHECK (delivery_longitude BETWEEN -180 AND 180),

  -- -------------------------------
  -- المرحلة 2: بيانات العميل وعناوين الاستلام والتسليم
  -- (مكررة لضمان عدم تأثرها بالتغييرات المستقبلية)
  -- -------------------------------

  -- بيانات العميل (Denormalized)
  customer_name       TEXT          NOT NULL,
  customer_phone      TEXT          NOT NULL,

  -- عنوان الاستلام من المتجر
  pickup_address      TEXT          NOT NULL,
  pickup_latitude     DECIMAL(10,7) NOT NULL,
  pickup_longitude    DECIMAL(10,7) NOT NULL,

  -- عنوان التوصيل للعميل
  delivery_address    TEXT          NOT NULL,
  delivery_latitude   DECIMAL(10,7) NOT NULL,
  delivery_longitude  DECIMAL(10,7) NOT NULL,
  delivery_apartment  TEXT,
  delivery_floor      TEXT,
  delivery_landmark   TEXT,

  -- -------------------------------
  -- المرحلة 3: تفاصيل الشحنة
  -- -------------------------------
  shipment_type_id    UUID          REFERENCES shipment_types(id) ON DELETE RESTRICT,
  shipment_description TEXT,
  shipment_weight_kg  DECIMAL(6,2),
  notes_for_driver    TEXT,

  CONSTRAINT chk_shipment_weight_positive
    CHECK (shipment_weight_kg IS NULL OR shipment_weight_kg > 0),

  -- -------------------------------
  -- المرحلة 4: البيانات المالية
  -- -------------------------------
  delivery_fee        DECIMAL(10,2) NOT NULL DEFAULT 0,
  platform_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  driver_earnings     DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method      payment_method NOT NULL DEFAULT 'cash',

  CONSTRAINT chk_delivery_fee_positive       CHECK (delivery_fee >= 0),
  CONSTRAINT chk_commission_positive         CHECK (platform_commission >= 0),
  CONSTRAINT chk_driver_earnings_positive    CHECK (driver_earnings >= 0),
  CONSTRAINT chk_commission_not_exceed_fee   CHECK (platform_commission <= delivery_fee),

  -- -------------------------------
  -- المرحلة 5: دورة حياة الطلب
  -- -------------------------------
  status              order_status    NOT NULL DEFAULT 'pending',
  priority            order_priority  NOT NULL DEFAULT 'normal',
  assigned_driver_id  UUID            REFERENCES drivers(id) ON DELETE SET NULL,
  assigned_at         TIMESTAMPTZ,

  -- -------------------------------
  -- المرحلة 6: إثبات التسليم
  -- -------------------------------
  otp_code                VARCHAR(6),
  otp_expires_at          TIMESTAMPTZ,
  otp_verified_at     TIMESTAMPTZ,
  proof_image_url     TEXT,

  -- -------------------------------
  -- المرحلة 7: الطوابع الزمنية للحالات
  -- -------------------------------
  published_at            TIMESTAMPTZ,
  driver_accepted_at      TIMESTAMPTZ,
  driver_arrived_store_at TIMESTAMPTZ,
  picked_up_at            TIMESTAMPTZ,
  delivered_at            TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  cancel_reason           TEXT,
  cancelled_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- -------------------------------
  -- المرحلة 8: أعمدة النظام
  -- -------------------------------
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER trg_delivery_orders_updated_at
  BEFORE UPDATE ON delivery_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------
-- المرحلة 9: الفهارس لتحسين الأداء
-- جميعها Partial Indexes لتقليل الحجم
-- -----------------------------------------

-- 1. طلبات المتجر
CREATE INDEX idx_orders_store
  ON delivery_orders(store_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 2. طلبات السائق المعين
CREATE INDEX idx_orders_driver
  ON delivery_orders(assigned_driver_id, created_at DESC)
  WHERE assigned_driver_id IS NOT NULL AND deleted_at IS NULL;

-- 3. البحث برقم هاتف العميل
CREATE INDEX idx_orders_customer_phone
  ON delivery_orders(customer_phone, created_at DESC)
  WHERE deleted_at IS NULL;

-- 4. الطلبات النشطة
CREATE INDEX idx_orders_status_active
  ON delivery_orders(status, created_at DESC)
  WHERE status IN (
    'pending', 'published', 'driver_accepted',
    'driver_arrived_store', 'picked_up', 'on_the_way'
  ) AND deleted_at IS NULL;

-- 5. الطلبات المنشورة المتاحة للسائقين
CREATE INDEX idx_orders_published
  ON delivery_orders(created_at)
  WHERE status = 'published' AND deleted_at IS NULL;

-- 6. دعم لوحة الإدارة (جميع الطلبات غير المحذوفة)
CREATE INDEX idx_orders_not_deleted
  ON delivery_orders(created_at DESC)
  WHERE deleted_at IS NULL;
