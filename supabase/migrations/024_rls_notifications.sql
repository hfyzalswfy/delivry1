-- =============================================
-- 024_rls_notifications.sql
-- =============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own"
ON notifications
FOR SELECT
USING (
    profile_id = auth.uid()
);

CREATE POLICY "admin_read"
ON notifications
FOR SELECT
USING (
    public.is_admin()
);

CREATE POLICY "system_insert"
ON notifications
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
);

CREATE POLICY "update_read"
ON notifications
FOR UPDATE
USING (
    profile_id = auth.uid()
)
WITH CHECK (
    profile_id = auth.uid()
);