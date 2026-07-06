-- =============================================
-- 004_stores.sql
-- جداول المتاجر والموظفين
-- =============================================

-- -----------------------------------------
-- جدول: stores
-- بيانات المتاجر المسجلة في النظام
-- -----------------------------------------
CREATE TABLE stores (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                UUID          NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  name                    TEXT          NOT NULL,
  commercial_registration TEXT,
  phone                   TEXT,
  email                   TEXT,
  address                 TEXT,
  latitude                DECIMAL(10,7),
  longitude               DECIMAL(10,7),
  logo_url                TEXT,

  is_active               BOOLEAN       NOT NULL DEFAULT true,
  deleted_at              TIMESTAMPTZ,

  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON COLUMN stores.email IS 'Business contact email for the store';

CREATE INDEX idx_stores_owner       ON stores(owner_id);
CREATE INDEX idx_stores_active      ON stores(is_active)  WHERE is_active = true;
CREATE INDEX idx_stores_not_deleted ON stores(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------
-- جدول: store_staff
-- موظفو المتجر المخولون بإدارة الطلبات
-- -----------------------------------------
CREATE TABLE store_staff (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  profile_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  can_create_orders BOOLEAN     NOT NULL DEFAULT true,
  can_view_reports  BOOLEAN     NOT NULL DEFAULT false,

  is_active         BOOLEAN     NOT NULL DEFAULT true,
  deleted_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(store_id, profile_id)
);

CREATE INDEX idx_store_staff_store       ON store_staff(store_id);
CREATE INDEX idx_store_staff_profile     ON store_staff(profile_id);
CREATE INDEX idx_store_staff_not_deleted ON store_staff(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_store_staff_updated_at
  BEFORE UPDATE ON store_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
