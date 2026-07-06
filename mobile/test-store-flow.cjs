const { createClient } = require('@supabase/supabase-js');
const URL = 'https://zibdohzkjwsnqctolrzj.supabase.co';
const KEY = 'sb_publishable_DF_3monB-2HIZcihoISKlg_jniEuDj5';

(async () => {
  const email = 'test-store-check-' + Date.now() + '@test.com';
  const s = createClient(URL, KEY);

  // Step 1: Sign up
  console.log('=== STEP 1: SIGN UP ===');
  const r1 = await s.auth.signUp({ email, password: 'test123456' });
  if (!r1.data?.user) { console.log('FAIL no user'); return; }
  const uid = r1.data.user.id;
  console.log('User ID:', uid);

  // Step 2: Insert profile
  console.log('\n=== STEP 2: INSERT PROFILE ===');
  const p = await s.from('profiles').insert({ id: uid, role: 'store', full_name: 'Test Store' });
  console.log('Profile insert error:', p.error?.message || 'OK');

  // Step 3: checkRoleRecord simulation - COUNT stores
  console.log('\n=== STEP 3: CHECK STORE COUNT ===');
  const c1 = await s.from('stores').select('id', { count: 'exact', head: true }).eq('owner_id', uid);
  console.log('Store count result:', JSON.stringify(c1));
  console.log('Store count error:', c1.error?.message || 'none');

  // Step 4: INSERT store (simulate setup)
  console.log('\n=== STEP 4: INSERT STORE (no .select()) ===');
  const ins = await s.from('stores').insert({ owner_id: uid, name: 'My Store', phone: '123', address: 'Addr' });
  console.log('Store insert error:', ins.error?.message || 'OK');
  console.log('Store insert data:', JSON.stringify(ins.data));

  // Step 5: checkRoleRecord again - COUNT stores
  console.log('\n=== STEP 5: CHECK STORE COUNT AFTER INSERT ===');
  const c2 = await s.from('stores').select('id', { count: 'exact', head: true }).eq('owner_id', uid);
  console.log('Store count result:', JSON.stringify(c2));
  console.log('Store count error:', c2.error?.message || 'none');

  // Step 6: SELECT store by owner_id (exact query from create-order)
  console.log('\n=== STEP 6: SELECT STORE BY owner_id ===');
  const q = await s.from('stores').select('id').eq('owner_id', uid).single();
  console.log('Store query data:', JSON.stringify(q.data));
  console.log('Store query error:', q.error?.message || 'none');

  // Step 7: Check if store record actually exists via direct count
  console.log('\n=== STEP 7: TOTAL STORE COUNT ===');
  const all = await s.from('stores').select('id', { count: 'exact', head: true });
  console.log('All stores count:', JSON.stringify(all));
  console.log('All stores error:', all.error?.message || 'none');

  // Step 8: Try with maybeSingle instead of single
  console.log('\n=== STEP 8: SELECT STORE .maybeSingle() ===');
  const q2 = await s.from('stores').select('id, owner_id, name').eq('owner_id', uid).maybeSingle();
  console.log('maybeSingle data:', JSON.stringify(q2.data));
  console.log('maybeSingle error:', q2.error?.message || 'none');

  // Step 9: Check all stores
  console.log('\n=== STEP 9: ALL STORES ===');
  const list = await s.from('stores').select('id, owner_id, name');
  console.log('Stores list:', JSON.stringify(list.data));
  console.log('Stores list error:', list.error?.message || 'none');
})();
