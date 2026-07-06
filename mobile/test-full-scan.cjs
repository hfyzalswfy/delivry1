const { createClient } = require('@supabase/supabase-js');
const URL = 'https://zibdohzkjwsnqctolrzj.supabase.co';
const KEY = 'sb_publishable_DF_3monB-2HIZcihoISKlg_jniEuDj5';

(async () => {
  const email = 'test-full-scan-' + Date.now() + '@test.com';
  const s = createClient(URL, KEY);
  const r = await s.auth.signUp({ email, password: 'test123456' });
  if (!r.data?.user) { console.log('no user'); return; }
  const uid = r.data.user.id;
  await s.from('profiles').insert({ id: uid, role: 'customer', full_name: 'T' });

  // All public tables in the project
  const allTables = [
    'profiles', 'stores', 'store_staff',
    'customers', 'customer_addresses',
    'drivers', 'driver_documents',
    'delivery_orders', 'order_assignments', 'order_status_history',
    'driver_locations',
    'conversations', 'conversation_participants', 'messages',
    'notifications',
    'shipment_types', 'notification_templates',
    'wallets', 'wallet_transactions',
  ];

  console.log('Table privilege scan (authenticated role):\n');
  for (const tbl of allTables) {
    const r = await s.from(tbl).select('count', { count: 'exact', head: true });
    const ok = !r.error;
    const code = r.error?.code || 'OK';
    const msg = r.error?.message?.slice(0, 60) || 'OK';
    console.log(`  ${tbl.padEnd(25)} ${ok ? '✅' : '❌'} ${code.padEnd(7)} ${msg}`);
  }
})();
