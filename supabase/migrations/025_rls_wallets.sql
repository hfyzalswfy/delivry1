ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own"
ON wallets
FOR SELECT
USING (
    profile_id = auth.uid()
);

CREATE POLICY "admin_read"
ON wallets
FOR SELECT
USING (
    public.is_admin()
);


ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own"
ON wallet_transactions
FOR SELECT
USING (
    wallet_id IN (
        SELECT id
        FROM wallets
        WHERE profile_id = auth.uid()
    )
);

CREATE POLICY "admin_read"
ON wallet_transactions
FOR SELECT
USING (
    public.is_admin()
);