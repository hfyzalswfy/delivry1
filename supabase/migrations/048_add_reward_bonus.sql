ALTER TABLE delivery_orders
ADD COLUMN reward_bonus DECIMAL(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN delivery_orders.reward_bonus IS 'Additional bonus reward for the driver on top of driver_earnings';
