-- Add structured address columns to stores table for Primary Store Address
-- This is fully additive — no destructive changes to existing data.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS building TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS notes TEXT;

-- Existing stores with null lat/lng remain valid; they will be prompted to
-- configure their address before creating orders. The CHECK constraints on
-- delivery_orders.pickup_latitude / pickup_longitude still enforce valid ranges
-- at order creation time, so a store must have valid coordinates before creating orders.

-- RLS: The existing store policies already handle SELECT/UPDATE for the owner
-- (owner_id = auth.uid()), so the new columns are automatically covered.
-- No RLS changes needed.

COMMENT ON COLUMN stores.landmark  IS 'Nearest landmark for delivery reference';
COMMENT ON COLUMN stores.building  IS 'Building name or number';
COMMENT ON COLUMN stores.notes     IS 'Additional delivery instructions for pickup';
