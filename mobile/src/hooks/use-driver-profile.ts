import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';
import { Drivers } from '../types/database';

export function useDriverProfile() {
  const profile = useAuthStore((s) => s.profile);
  const [driver, setDriver] = useState<Drivers | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    cancelledRef.current = false;

    (async () => {
      const { data } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();
      
      if (cancelledRef.current) return;
      
      if (data) {
        setDriverId(data.id);
      }
      setLoading(false);
    })();

    return () => { cancelledRef.current = true; };
  }, [profile]);

  useEffect(() => {
    if (!driverId) return;
    cancelledRef.current = false;

    (async () => {
      const { data } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .maybeSingle();
      
      if (!cancelledRef.current && data) {
        setDriver(data);
      }
    })();

    return () => { cancelledRef.current = true; };
  }, [driverId]);

  return { driver, driverId, loading };
}
