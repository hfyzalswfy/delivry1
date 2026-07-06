const { createClient } = require('@supabase/supabase-js');
const URL = 'https://zibdohzkjwsnqctolrzj.supabase.co';
const KEY = 'sb_publishable_DF_3monB-2HIZcihoISKlg_jniEuDj5';

(async () => {
  const email = 'test-all-privs-' + Date.now() + '@test.com';
  const s = createClient(URL, KEY);
  const r = await s.auth.signUp({ email, password: 'test123456' });
  if (!r.data?.user) { console.log('no user'); return; }
  const uid = r.data.user.id;

  // Insert profile
  await s.from('profiles').insert({ id: uid, role: 'customer', full_name: 'T' });

  const tables = ['profiles', 'stores', 'customers', 'drivers'];
  for (const tbl of tables) {
    // SELECT (id only)
    console.log('\n' + tbl + ':');
    const r1 = await s.from(tbl).select('id').limit(1);
    console.log('  SELECT:', '(' + (r1.error?.code || 'OK') + ') ' + (r1.error?.message?.slice(0,70) || 'success'));
    
    // INSERT (minimal data)
    const r2 = await s.from(tbl).insert({ id: uid, role: 'customer', full_name: 'X' }).select().maybeSingle();
    console.log('  INSERT:', '(' + (r2.error?.code || 'OK') + ') ' + (r2.error?.message?.slice(0,70) || 'success'));
  }
})();
