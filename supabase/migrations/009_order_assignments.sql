-- =============================================
-- 009_order_assignments.sql
-- جداول التخصيص وسجل الحالات + Trigger التزامن
-- =============================================

-- -----------------------------------------
-- Function: sync_assigned_driver
-- تعمل AFTER INSERT OR UPDATE OF status على order_assignments
-- تمنع قبول أكثر من سائق لنفس الطلب عبر شرط status = 'published'
-- -----------------------------------------
CREATE OR REPLACE FUNCTION sync_assigned_driver()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- منع إعادة التنفيذ إذا لم تتغير قيمة status فعلياً
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' THEN

    -- محاولة تعيين السائق: فقط إذا الطلب لا يزال published
    UPDATE delivery_orders
    SET assigned_driver_id    = NEW.driver_id,
        assigned_at           = NEW.responded_at,
        status                = 'driver_accepted',
        driver_accepted_at    = NEW.responded_at
    WHERE id = NEW.order_id
      AND status = 'published';

    IF FOUND THEN
      -- نجح التخصيص: إنهاء جميع التخصيصات المعلقة الأخرى
      UPDATE order_assignments
      SET status = 'expired'
      WHERE order_id = NEW.order_id
        AND id != NEW.id
        AND status = 'pending';
    ELSE
      -- فشل التخصيص: الطلب لم يعد published ← إنهاء هذا التخصيص
      UPDATE order_assignments
      SET status = 'expired'
      WHERE id = NEW.id AND status = 'pending';
    END IF;

  ELSIF NEW.status IN ('rejected', 'expired') THEN
    -- لا تعدل assigned_driver_id في delivery_orders
    -- يقوم التطبيق أو Edge Functions بإعادة النشر عند الحاجة
    NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------
-- جدول: order_assignments
-- سجل جميع محاولات التخصيص (قبول/رفض/انتهاء مهلة)
-- -----------------------------------------
CREATE TABLE order_assignments (
  id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID              NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  driver_id        UUID              NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  status           assignment_status NOT NULL DEFAULT 'pending',
  responded_at     TIMESTAMPTZ,
  distance_km      DECIMAL(6,2),
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ       NOT NULL DEFAULT now(),

  CONSTRAINT chk_assignment_distance
    CHECK (distance_km IS NULL OR distance_km >= 0),

  UNIQUE(order_id, driver_id)
);

CREATE INDEX idx_assignments_order
  ON order_assignments(order_id);

CREATE INDEX idx_assignments_order_pending
  ON order_assignments(order_id)
  WHERE status = 'pending';

CREATE INDEX idx_assignments_driver_pending
  ON order_assignments(driver_id, created_at DESC)
  WHERE status = 'pending';

-- -----------------------------------------
-- Trigger: trg_sync_assigned_driver
-- ربط الـ Function بجدول order_assignments
-- -----------------------------------------
CREATE TRIGGER trg_sync_assigned_driver
  AFTER INSERT OR UPDATE OF status
  ON order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION sync_assigned_driver();

-- -----------------------------------------
-- جدول: order_status_history
-- سجل زمني لجميع تغييرات حالة الطلب
-- غير قابل للتعديل (لا updated_at ولا deleted_at)
-- -----------------------------------------
CREATE TABLE order_status_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID        NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  from_status     order_status,
  to_status       order_status NOT NULL,
  changed_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_role user_role,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_history_order
  ON order_status_history(order_id, created_at);
