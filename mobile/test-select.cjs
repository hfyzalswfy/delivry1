const { createClient } = require('@supabase/supabase-js');
const URL = 'https://zibdohzkjwsnqctolrzj.supabase.co';
const KEY = 'sb_publishable_DF_3monB-2HIZcihoISKlg_jniEuDj5';

(async () => {
  // Test 1: SELECT with anon key (no auth)
  console.log('=== TEST 1: Anon SELECT ===');
  const s1 = createClient(URL, KEY);
  const r1 = await s1.from('profiles').select('count', { count: 'exact', head: true });
  console.log('anon count:', r1.error?.message || 'OK');

  // Test 2: SELECT after signUp (same client)
  console.log('');
  console.log('=== TEST 2: SELECT after signUp (same client) ===');
  const s2 = createClient(URL, KEY);
  const signup = await s2.auth.signUp({ email: 'test-sel-' + Date.now() + '@test.com', password: 'test123456' });
  if (signup.data?.user) {
    // Insert profile with s2
    await s2.from('profiles').insert({ id: signup.data.user.id, role: 'customer', full_name: 'T' });
    // Now SELECT with s2
    const r2 = await s2.from('profiles').select('id').eq('id', signup.data.user.id).maybeSingle();
    console.log('same-client select:', r2.error?.message || 'OK', 'data:', !!r2.data);
  }

  // Test 3: New client signIn then SELECT
  console.log('');
  console.log('=== TEST 3: New client signIn then SELECT ===');
  const email3 = 'test-sel-3-' + Date.now() + '@test.com';
  const s3a = createClient(URL, KEY);
  const su3 = await s3a.auth.signUp({ email: email3, password: 'test123456' });
  if (su3.data?.user) {
    await s3a.from('profiles').insert({ id: su3.data.user.id, role: 'customer', full_name: 'T' });
    await s3a.auth.signOut();
    
    const s3b = createClient(URL, KEY);
    await s3b.auth.signInWithPassword({ email: email3, password: 'test123456' });
    const r3 = await s3b.from('profiles').select('id').eq('id', su3.data.user.id).maybeSingle();
    console.log('new-client select:', r3.error?.message || 'OK', 'data:', !!r3.data);
  }
})();
