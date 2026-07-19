-- =============================================
-- 062_store_add_customer_address.sql
-- SECURITY DEFINER RPC for stores to add customer addresses
-- Fixes RLS violation: "new row violates row-level security policy for table customer_addresses"
-- =============================================

CREATE OR REPLACE FUNCTION public.add_customer_address(
  p_customer_id UUID,
  p_address_text TEXT,
  p_latitude DECIMAL(10,7),
  p_longitude DECIMAL(10,7),
  p_label TEXT DEFAULT NULL,
  p_apartment TEXT DEFAULT NULL,
  p_floor TEXT DEFAULT NULL,
  p_landmark TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_address_id UUID;
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM stores WHERE owner_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM store_staff WHERE profile_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only store users can add customer addresses';
  END IF;

  INSERT INTO public.customer_addresses (
    customer_id, label, address_text, latitude, longitude,
    apartment, floor, landmark, notes, is_default
  ) VALUES (
    p_customer_id, p_label, p_address_text, p_latitude, p_longitude,
    p_apartment, p_floor, p_landmark, p_notes, false
  ) RETURNING id INTO v_address_id;

  SELECT jsonb_build_object(
    'id', ca.id,
    'customer_id', ca.customer_id,
    'label', ca.label,
    'address_text', ca.address_text,
    'latitude', ca.latitude,
    'longitude', ca.longitude,
    'apartment', ca.apartment,
    'floor', ca.floor,
    'landmark', ca.landmark,
    'notes', ca.notes
  ) INTO v_result
  FROM public.customer_addresses ca
  WHERE ca.id = v_address_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_customer_address TO authenticated;
