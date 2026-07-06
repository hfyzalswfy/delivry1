-- =============================================
-- 005_customers.sql
-- جداول العملاء المستلمين وعناوينهم
-- =============================================

-- -----------------------------------------
-- جدول: customers
-- العملاء المستلمون للطلبات
-- منفصل عن auth.users لدعم العملاء غير المسجلين
-- -----------------------------------------
CREATE TABLE customers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  full_name  TEXT        NOT NULL,
  phone      TEXT        NOT NULL,
  email      TEXT,
  notes      TEXT,

  is_active  BOOLEAN     NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_phone       ON customers(phone);
CREATE INDEX idx_customers_profile     ON customers(profile_id);
CREATE INDEX idx_customers_not_deleted ON customers(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------
-- جدول: customer_addresses
-- عناوين التوصيل الخاصة بالعملاء
-- -----------------------------------------
CREATE TABLE customer_addresses (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID          NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label        TEXT,
  address_text TEXT          NOT NULL,
  latitude     DECIMAL(10,7) NOT NULL,
  longitude    DECIMAL(10,7) NOT NULL,
  apartment    TEXT,
  floor        TEXT,
  landmark     TEXT,
  is_default   BOOLEAN       NOT NULL DEFAULT false,

  deleted_at   TIMESTAMPTZ,

  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_addresses_customer    ON customer_addresses(customer_id);
CREATE INDEX idx_customer_addresses_not_deleted ON customer_addresses(deleted_at) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_customer_default_address
  ON customer_addresses(customer_id)
  WHERE is_default = true
    AND deleted_at IS NULL;

CREATE TRIGGER trg_customer_addresses_updated_at
  BEFORE UPDATE ON customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
