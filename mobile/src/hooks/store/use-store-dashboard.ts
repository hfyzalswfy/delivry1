import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { DeliveryOrders, Stores, Wallets } from '../../types/database';

export interface DashboardStats {
  totalToday: number;
  pendingCount: number;
  driverProcessingCount: number;
  inTransitCount: number;
  deliveredCount: number;
  cancelledCount: number;
  totalDeliveryFees: number;
  totalCommission: number;
}

interface StoreDashboardData {
  store: Stores | null;
  stats: DashboardStats | null;
  recentOrders: DeliveryOrders[];
  wallet: Wallets | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => void;
}

export function useStoreDashboard(): StoreDashboardData {
  const profile = useAuthStore((s) => s.profile);
  const [store, setStore] = useState<Stores | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<DeliveryOrders[]>([]);
  const [wallet, setWallet] = useState<Wallets | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const storeIdRef = useRef<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    const currentProfile = useAuthStore.getState().profile;
    if (!currentProfile) return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      let sid = storeIdRef.current;
      if (!sid) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', currentProfile.id)
          .single();

        if (!storeData) {
          setError('No store found. Please contact support.');
          setLoading(false);
          setRefreshing(false);
          return;
        }
        sid = storeData.id;
        storeIdRef.current = sid;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStr = todayStart.toISOString();

      const [storeResult, todayResult, walletResult, recentResult] = await Promise.all([
        supabase.from('stores').select('*').eq('id', sid).single(),
        supabase.from('delivery_orders').select('*').eq('store_id', sid).gte('created_at', todayStr),
        supabase.from('wallets').select('*').eq('profile_id', currentProfile.id).single(),
        supabase.from('delivery_orders').select('*').eq('store_id', sid).order('created_at', { ascending: false }).limit(10),
      ]);

      if (storeResult.data) setStore(storeResult.data);
      if (storeResult.error) setError(storeResult.error.message);

      if (todayResult.data) {
        const orders = todayResult.data;
        setStats({
          totalToday: orders.length,
          pendingCount: orders.filter((o) => o.status === 'pending' || o.status === 'published').length,
          driverProcessingCount: orders.filter((o) => o.status === 'driver_accepted' || o.status === 'driver_arrived_store').length,
          inTransitCount: orders.filter((o) => o.status === 'picked_up' || o.status === 'on_the_way' || o.status === 'driver_arrived_destination').length,
          deliveredCount: orders.filter((o) => o.status === 'delivered').length,
          cancelledCount: orders.filter((o) => o.status === 'cancelled').length,
          totalDeliveryFees: orders.reduce((s, o) => s + Number(o.delivery_fee), 0),
          totalCommission: orders.reduce((s, o) => s + Number(o.platform_commission), 0),
        });
      }

      if (walletResult.data) setWallet(walletResult.data);
      if (recentResult.data) setRecentOrders(recentResult.data);

      if (!channelRef.current && sid) {
        const channel = supabase.channel(`store-dashboard-${currentProfile.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_orders', filter: `store_id=eq.${sid}` }, () => {
            fetchData(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `profile_id=eq.${currentProfile.id}` }, () => {
            fetchData(true);
          })
          .subscribe();
        channelRef.current = channel;
      }
    } catch (e: any) {
      setError(e?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchData();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile?.id]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return { store, stats, recentOrders, wallet, loading, error, refreshing, refresh };
}
