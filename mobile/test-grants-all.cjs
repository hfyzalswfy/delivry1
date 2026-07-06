const { createClient } = require('@supabase/supabase-js');
const URL = 'https://zibdohzkjwsnqctolrzj.supabase.co';
const KEY = 'sb_publishable_DF_3monB-2HIZcihoISKlg_jniEuDj5';

(async () => {
  const email = 'test-grants-' + Date.now() + '@test.com';
  const s = createClient(URL, KEY);
  const su = await s.auth.signUp({ email, password: 'test123456' });
  if (!su.data?.user) { console.log('no user'); return; }
  const uid = su.data.user.id;

  // Insert profile
  await s.from('profiles').insert({ id: uid, role: 'customer', full_name: 'T' });

  // Test ALL operations on ALL 4 tables
  const tables = ['profiles', 'stores', 'customers', 'drivers'];
  for (const tbl of tables) {
    console.log(tbl + ':');
    
    // SELECT
    const r1 = await s.from(tbl).select('id').limit(1);
    console.log('  SELECT:', r1.error?.message?.slice(0,60) || 'OK');

    // INSERT (test with a temp record, then delete)
    const r2 = await s.from(tbl).insert({ id: uid, role: 'customer', full_name: 'X' }).select().maybeSingle();
    console.log('  INSERT:', r2.error?.message?.slice(0,60) || 'OK');
  }
})();
