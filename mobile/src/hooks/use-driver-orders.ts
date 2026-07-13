import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';
import { DeliveryOrders } from '../types/database';

const ACTIVE_STATUSES = ['driver_accepted', 'driver_arrived_store', 'picked_up', 'on_the_way', 'driver_arrived_destination'];
const COMPLETED_STATUSES = ['delivered'];
const CANCELLED_STATUSES = ['cancelled'];

export function useDriverOrders() {
  const profile = useAuthStore((s) => s.profile);
  const [activeOrders, setActiveOrders] = useState<DeliveryOrders[]>([]);
  const [completedOrders, setCompletedOrders] = useState<DeliveryOrders[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<DeliveryOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);
  const driverIdRef = useRef<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!driverIdRef.current) return;

    const { data } = await supabase
      .from('delivery_orders')
      .select('*')
      .eq('assigned_driver_id', driverIdRef.current)
      .order('created_at', { ascending: false });

    if (data && !cancelledRef.current) {
      setActiveOrders(data.filter((o) => ACTIVE_STATUSES.includes(o.status)));
      setCompletedOrders(data.filter((o) => COMPLETED_STATUSES.includes(o.status)));
      setCancelledOrders(data.filter((o) => CANCELLED_STATUSES.includes(o.status)));
    }
  }, []);

  useEffect(() => {
    if (profile?.role !== 'driver') return;
    cancelledRef.current = false;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!driver || cancelledRef.current) return;
      driverIdRef.current = driver.id;

      await fetchOrders();

      if (cancelledRef.current) return;

      channel = supabase.channel(`driver-my-orders-${driver.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'delivery_orders',
          filter: `assigned_driver_id=eq.${driver.id}`,
        }, () => {
          fetchOrders();
        })
        .subscribe();

      if (!cancelledRef.current) setLoading(false);
    })();

    return () => {
      cancelledRef.current = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role, fetchOrders]);

  return { activeOrders, completedOrders, cancelledOrders, loading, refresh: fetchOrders };
}
