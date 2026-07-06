const { createClient } = require('@supabase/supabase-js');
const URL = 'https://zibdohzkjwsnqctolrzj.supabase.co';
const KEY = 'sb_publishable_DF_3monB-2HIZcihoISKlg_jniEuDj5';

(async () => {
  // =============================================
  // TEST 1: Can authenticated user SELECT from stores?
  // =============================================
  console.log('=== TEST 1: Sign up + check store permissions ===');
  const s1 = createClient(URL, KEY);
  const r1 = await s1.auth.signUp({ email: 'test-invest-' + Date.now() + '@test.com', password: 'test123456' });
  if (!r1.data?.user) { console.log('FAIL no user'); return; }
  const uid = r1.data.user.id;
  console.log('User ID:', uid);
  
  // Insert profile
  await s1.from('profiles').insert({ id: uid, role: 'store', full_name: 'Test Store Owner' });
  console.log('Profile inserted');

  // =============================================
  // TEST 2: Select stores (any) after auth
  // =============================================  
  console.log('\n=== TEST 2: SELECT stores (table-level + RLS) ===');
  const selAll = await s1.from('stores').select('id, owner_id, name');
  console.log('SELECT stores error code:', selAll.error?.code || 'OK');
  console.log('SELECT stores error msg:', selAll.error?.message?.slice(0,100) || 'success');
  console.log('SELECT stores data:', JSON.stringify(selAll.data));
  
  // Try with .maybeSingle
  const selOwn = await s1.from('stores').select('id').eq('owner_id', uid).maybeSingle();
  console.log('\nSELECT own store:');
  console.log('  data:', JSON.stringify(selOwn.data));
  console.log('  error code:', selOwn.error?.code || 'OK');
  console.log('  error msg:', selOwn.error?.message?.slice(0,100) || 'none');
  
  // =============================================
  // TEST 3: Try INSERT into stores (simulate setup)
  // =============================================
  console.log('\n=== TEST 3: INSERT into stores (simulate setup) ===');
  const ins = await s1.from('stores').insert({ owner_id: uid, name: 'My Investigation Store' });
  console.log('INSERT error code:', ins.error?.code || 'OK');
  console.log('INSERT error msg:', ins.error?.message?.slice(0,100) || 'success');
  
  // =============================================
  // TEST 4: SELECT after INSERT
  // =============================================
  console.log('\n=== TEST 4: SELECT stores after INSERT ===');
  const sel2 = await s1.from('stores').select('id, owner_id, name').eq('owner_id', uid);
  console.log('SELECT after insert:');
  console.log('  data:', JSON.stringify(sel2.data));
  console.log('  error code:', sel2.error?.code || 'OK');
  console.log('  error msg:', sel2.error?.message?.slice(0,100) || 'none');
  
  // =============================================
  // TEST 5: Exact query from create-order.tsx
  // =============================================
  console.log('\n=== TEST 5: Exact .single() query from create-order ===');
  const ex = await s1.from('stores').select('id').eq('owner_id', uid).single();
  console.log('  data:', JSON.stringify(ex.data));
  console.log('  error code:', ex.error?.code || 'OK');
  console.log('  error msg:', ex.error?.message?.slice(0,100) || 'none');
})();
