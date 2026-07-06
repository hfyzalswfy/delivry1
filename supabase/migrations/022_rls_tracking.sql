-- =============================================
-- 022_rls_tracking.sql
-- RLS: التتبع الجغرافي (driver_locations)
-- =============================================
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- السائق يقرأ ويُدرج مواقعه فقط
CREATE POLICY "driver_select_own" ON driver_locations
  FOR SELECT USING (
    driver_id = (SELECT id FROM drivers WHERE profile_id = auth.uid())
  );

CREATE POLICY "driver_insert_own" ON driver_locations
  FOR INSERT WITH CHECK (
    driver_id = (SELECT id FROM drivers WHERE profile_id = auth.uid())
  );

-- Admin: الكل
CREATE POLICY "admin_select" ON driver_locations
  FOR SELECT USING (public.is_admin());
