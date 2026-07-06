-- =============================================
-- 011_driver_locations.sql
-- سجل التتبع الجغرافي للسائقين
-- Time-Series table: لا تحديث ولا حذف فردي
-- =============================================

-- -----------------------------------------
-- جدول: driver_locations
-- تخزين نقاط GPS التاريخية لكل سائق
-- -----------------------------------------
CREATE TABLE driver_locations (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID          NOT NULL REFERENCES drivers(id)  ON DELETE CASCADE,
  order_id    UUID          REFERENCES delivery_orders(id)   ON DELETE SET NULL,
  latitude    DECIMAL(10,7) NOT NULL,
  longitude   DECIMAL(10,7) NOT NULL,
  accuracy    INTEGER,
  recorded_at TIMESTAMPTZ   NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT chk_latitude_check
    CHECK (latitude  BETWEEN -90  AND 90),
  CONSTRAINT chk_longitude_check
    CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT chk_accuracy_positive
    CHECK (accuracy IS NULL OR accuracy >= 0)
);

COMMENT ON TABLE driver_locations IS
  'GPS tracking points. Retention: ~90 days. Cleanup via batched DELETE on recorded_at.';

COMMENT ON COLUMN driver_locations.accuracy IS
  'GPS accuracy in meters from device (0 = best). NULL = unknown.';

COMMENT ON COLUMN driver_locations.recorded_at IS
  'Timestamp from device (not server). Used for ordering and retention.';

COMMENT ON COLUMN driver_locations.order_id IS
  'The active delivery order at the time this location was recorded. NULL = no active order.';

-- -----------------------------------------
-- الفهارس (Indexes)
-- FILLFACTOR = 80 للفهرس الثاني لتحمل
-- الإدراج المتكرر لنفس driver_id
-- -----------------------------------------
CREATE INDEX idx_driver_locations_order
  ON driver_locations(order_id, recorded_at);

CREATE INDEX idx_driver_locations_driver
  ON driver_locations(driver_id, recorded_at DESC)
  WITH (FILLFACTOR = 80);

CREATE INDEX idx_driver_locations_retention
  ON driver_locations(recorded_at);

-- -----------------------------------------
-- Trigger: تحديث آخر موقع معروف للسائق
-- AFTER INSERT: نقطة الموقع تُحفظ أولاً،
-- ثم يُحدّث drivers.current_latitude/longitude
-- -----------------------------------------
CREATE OR REPLACE FUNCTION update_driver_last_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- تحديث drivers فقط إذا كانت النقطة الجديدة أحدث
  UPDATE drivers
  SET current_latitude    = NEW.latitude,
      current_longitude   = NEW.longitude,
      location_updated_at = NEW.recorded_at
  WHERE id = NEW.driver_id
    AND (
      location_updated_at IS NULL
      OR NEW.recorded_at >= location_updated_at
    );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_driver_locations_after_insert
  AFTER INSERT ON driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_last_location();
