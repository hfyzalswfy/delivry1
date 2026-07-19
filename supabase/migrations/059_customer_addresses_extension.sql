-- =============================================
-- 059_customer_addresses_extension.sql
-- Yemen-market address extensions
-- =============================================

-- 1. Add notes column to customer_addresses
ALTER TABLE customer_addresses ADD COLUMN notes TEXT;
COMMENT ON COLUMN customer_addresses.notes IS 'ملاحظات إضافية للتوصيل';

-- 2. Add delivery_notes column to delivery_orders
ALTER TABLE delivery_orders ADD COLUMN delivery_notes TEXT;
COMMENT ON COLUMN delivery_orders.delivery_notes IS 'ملاحظات توصيل خاصة بهذا الطلب';

-- 3. Customer INSERT policy
CREATE POLICY "customer_insert" ON customer_addresses
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );

-- 4. Customer UPDATE policy
CREATE POLICY "customer_update" ON customer_addresses
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  ) WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );

-- 5. Customer DELETE policy
CREATE POLICY "customer_delete" ON customer_addresses
  FOR DELETE USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
  );

-- 6. Store SELECT policy (can read addresses of customers who have orders with them)
CREATE POLICY "store_select" ON customer_addresses
  FOR SELECT USING (
    customer_id IN (
      SELECT customer_id FROM delivery_orders
      WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
         OR store_id IN (SELECT store_id FROM store_staff WHERE profile_id = auth.uid())
    )
  );
