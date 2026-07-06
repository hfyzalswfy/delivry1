-- =============================================
-- 006_drivers.sql
-- جداول السائقين والمستندات
-- =============================================

-- -----------------------------------------
-- جدول: drivers
-- بيانات السائقين وحالة التوفر والموقع
-- -----------------------------------------
CREATE TABLE drivers (
  id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID                NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  availability        driver_availability NOT NULL DEFAULT 'offline',
  current_latitude    DECIMAL(10,7),
  current_longitude   DECIMAL(10,7),
  location_updated_at TIMESTAMPTZ,
  vehicle_type        TEXT,
  vehicle_plate       TEXT,
  vehicle_color       TEXT,
  is_verified         BOOLEAN             NOT NULL DEFAULT false,
  is_active           BOOLEAN             NOT NULL DEFAULT true,
  average_rating      DECIMAL(2,1)        NOT NULL DEFAULT 0.0,
  total_deliveries    INTEGER             NOT NULL DEFAULT 0,

  CONSTRAINT chk_driver_rating CHECK (average_rating >= 0 AND average_rating <= 5),

  bank_name           TEXT,
  bank_account_name   TEXT,
  bank_account_number TEXT,

  deleted_at          TIMESTAMPTZ,

  created_at          TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ         NOT NULL DEFAULT now(),

  UNIQUE(profile_id)
);

COMMENT ON COLUMN drivers.current_latitude  IS 'آخر موقع معروف للسائق (Last Known Location)';
COMMENT ON COLUMN drivers.current_longitude IS 'آخر موقع معروف للسائق (Last Known Location)';

CREATE INDEX idx_drivers_profile      ON drivers(profile_id);
CREATE INDEX idx_drivers_availability ON drivers(availability, is_verified, is_active);
CREATE INDEX idx_drivers_not_deleted  ON drivers(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------
-- جدول: driver_documents
-- مستندات التحقق من السائق (رخصة، مركبة، هوية)
-- -----------------------------------------
CREATE TABLE driver_documents (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id        UUID            NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  document_type    TEXT            NOT NULL,
  document_url     TEXT            NOT NULL,
  status           document_status NOT NULL DEFAULT 'pending',
  reviewed_by      UUID            REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at       DATE,

  deleted_at       TIMESTAMPTZ,

  created_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_driver_documents_driver       ON driver_documents(driver_id);
CREATE INDEX idx_driver_documents_status       ON driver_documents(status);
CREATE INDEX idx_driver_documents_not_deleted  ON driver_documents(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_driver_documents_updated_at
  BEFORE UPDATE ON driver_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
