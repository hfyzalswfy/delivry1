import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';
import { DeliveryOrders, OrderStatus } from '../types/database';

interface OrderGuardResult {
  /** Whether the user is allowed to access this screen */
  allowed: boolean;
  /** Still fetching data */
  loading: boolean;
  /** Error/denial message if not allowed */
  error: string | null;
  /** The full order if accessible */
  order: DeliveryOrders | null;
  /** The driver's DB record id (not profile_id) */
  driverId: string | null;
}

/**
 * Reusable route guard for driver screens.
 *
 * Fetches the order, checks status matches `expectedStatus`,
 * and verifies the current driver is the assigned driver.
 *
 * @param orderId - The delivery order UUID
 * @param expectedStatus - The required status to access this screen
 * @param channelName - Optional unique channel name for Realtime sub (defaults to `order-guard-${orderId}`)
 */
export function useOrderGuard(
  orderId: string,
  expectedStatus: OrderStatus | OrderStatus[],
  channelName?: string,
): OrderGuardResult {
  const profile = useAuthStore((s) => s.profile);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);

  const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      if (!profile) {
        if (!cancelled) { setError('Authentication required'); setLoading(false); }
        return;
      }

      // Fetch driver record
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!driver) {
        if (!cancelled) { setError('Driver profile not found'); setLoading(false); }
        return;
      }

      const dId = driver.id;
      if (!cancelled) setDriverId(dId);

      // Fetch order
      const { data: o } = await supabase
        .from('delivery_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!o) {
        if (!cancelled) { setError('Order not found'); setLoading(false); }
        return;
      }

      if (!cancelled) setOrder(o);

      // Status guard
      if (!expected.includes(o.status as OrderStatus)) {
        if (!cancelled) {
          setError(
            `This screen is only available when the order status is "${expected.join(' or ')}". Current status: ${o.status.replace(/_/g, ' ')}`,
          );
          setLoading(false);
        }
        return;
      }

      // Driver assignment guard
      if (o.assigned_driver_id !== dId) {
        if (!cancelled) { setError('You are not the assigned driver for this order'); setLoading(false); }
        return;
      }

      if (!cancelled) {
        setAllowed(true);
        setLoading(false);
      }

      // Realtime subscription for live order updates
      channel = supabase
        .channel(channelName ?? `order-guard-${orderId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `id=eq.${orderId}` },
          (payload) => {
            setOrder(payload.new as DeliveryOrders);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId, profile?.id]);

  return { allowed, loading, error, order, driverId };
}
