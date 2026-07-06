const { createClient } = require('@supabase/supabase-js');

const URL = 'https://zibdohzkjwsnqctolrzj.supabase.co';
const KEY = 'sb_publishable_DF_3monB-2HIZcihoISKlg_jniEuDj5';

(async () => {
  const email = 'test-flow-' + Date.now() + '@test.com';

  // ===== SIGN UP =====
  console.log('=== SIGN UP ===');
  const s1 = createClient(URL, KEY);
  const r1 = await s1.auth.signUp({ email, password: 'test123456' });
  console.log('signUp user:', r1.data?.user?.id);
  console.log('signUp session:', !!r1.data?.session);
  if (!r1.data?.user) { console.log('FAIL: no user'); return; }

  const uid = r1.data.user.id;

  const ins = await s1.from('profiles').insert({
    id: uid,
    role: 'customer',
    full_name: 'Test User',
  });
  if (ins.error) { console.log('profile insert error:', ins.error.message); return; }
  console.log('profile inserted OK');

  await s1.auth.signOut();
  console.log('signed out');

  // ===== SIGN IN =====
  console.log('');
  console.log('=== SIGN IN ===');
  const s2 = createClient(URL, KEY);
  const r2 = await s2.auth.signInWithPassword({ email, password: 'test123456' });
  console.log('signIn error:', r2.error?.message || 'none');
  console.log('signIn session:', !!r2.data?.session);
  console.log('signIn user:', r2.data?.user?.id);

  // ===== GET SESSION =====
  console.log('');
  console.log('=== GET SESSION ===');
  const { data: { session } } = await s2.auth.getSession();
  console.log('getSession:', !!session);
  console.log('session user id:', session?.user?.id);

  // ===== QUERY PROFILE =====
  console.log('');
  console.log('=== QUERY PROFILE ===');
  const q = await s2
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', session?.user?.id)
    .maybeSingle();
  console.log('profile data:', JSON.stringify(q.data));
  console.log('profile error:', q.error?.message || 'none');
  console.log('profile found:', !!q.data);

  if (!q.data) {
    console.log('');
    console.log('=== RETRY single() ===');
    const q2 = await s2.from('profiles').select('id').eq('id', session?.user?.id).single();
    console.log('single() data:', JSON.stringify(q2.data));
    console.log('single() error:', q2.error?.message || 'none');
  }
})();
