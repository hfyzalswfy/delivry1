-- =============================================
-- 007_shipment_types.sql
-- جدول أنواع الشحنات (جدول مرجعي)
-- =============================================

CREATE TABLE shipment_types (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT          NOT NULL UNIQUE,
  name_ar       TEXT          NOT NULL,
  description   TEXT,
  max_weight_kg DECIMAL(6,2),
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  sort_order    INTEGER       NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT chk_shipment_weight
    CHECK (max_weight_kg IS NULL OR max_weight_kg > 0)
);

CREATE INDEX idx_shipment_types_active
  ON shipment_types(is_active, sort_order);
