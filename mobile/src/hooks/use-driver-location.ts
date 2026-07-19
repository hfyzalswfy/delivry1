import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';
import { isValidCoordinate } from '../lib/geo';

export function useDriverLocation(orderId?: string) {
  const profile = useAuthStore((s) => s.profile);
  const cancelledRef = useRef(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const driverIdRef = useRef<string | null>(null);
  const orderIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (profile?.role !== 'driver' || !orderId) return;
    if (orderIdRef.current === orderId && driverIdRef.current) return;
    orderIdRef.current = orderId;
    cancelledRef.current = false;

    let driverId: string | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelledRef.current) return;

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!driver || cancelledRef.current) return;
      driverId = driver.id;
      driverIdRef.current = driver.id;

      const { data: order } = await supabase
        .from('delivery_orders')
        .select('assigned_driver_id')
        .eq('id', orderId)
        .single();

      if (!order || order.assigned_driver_id !== driver.id || cancelledRef.current) return;

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5_000,
          distanceInterval: 20,
        },
        async (loc) => {
          if (cancelledRef.current) return;
          const { latitude, longitude } = loc.coords;
          if (!isValidCoordinate(latitude, longitude)) return;

          await supabase.from('driver_locations').insert({
            driver_id: driver.id,
            order_id: orderId,
            latitude,
            longitude,
            accuracy: loc.coords.accuracy ?? null,
            recorded_at: new Date().toISOString(),
          });

          await supabase
            .from('drivers')
            .update({
              current_latitude: latitude,
              current_longitude: longitude,
              location_updated_at: new Date().toISOString(),
            })
            .eq('id', driver.id);
        },
      );

      if (cancelledRef.current) {
        subscription.remove();
        return;
      }
      subscriptionRef.current?.remove();
      subscriptionRef.current = subscription;
    })();

    return () => {
      cancelledRef.current = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [profile?.id, profile?.role, orderId]);
}
