import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { DeliveryOrders, Drivers } from '../../../src/types/database';
import { calculateDistance } from '../../../src/lib/geo';
import { useColors } from '../../../src/theme/ThemeProvider';
import { DriverHeader } from '../../../src/components/driver/DriverHeader';
import { DriverStatsGrid } from '../../../src/components/driver/DriverStatsGrid';
import { AvailableOrdersSection } from '../../../src/components/driver/AvailableOrdersSection';
import { DriverQuickActions } from '../../../src/components/driver/DriverQuickActions';
import { DriverPerformanceSummary } from '../../../src/components/driver/DriverPerformanceSummary';

export default function DriverHomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [driverRecord, setDriverRecord] = useState<Drivers | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeDeliveries, setActiveDeliveries] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [weeklyDeliveries, setWeeklyDeliveries] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [availableOrders, setAvailableOrders] = useState<DeliveryOrders[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const cancelledRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const driverId = driverRecord?.id;

  const fetchDriverData = useCallback(async () => {
    if (!profile) return;
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('profile_id', profile.id)
      .single();
    if (driver && !cancelledRef.current) {
      setDriverRecord(driver);
      setIsOnline(driver.availability === 'online');
    }
    return driver;
  }, [profile]);

  const fetchStats = useCallback(async (dId: string) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [
      { count: activeCount },
      { count: todayCount },
      { data: earningsData },
      { data: weekData },
      { count: notifCount },
    ] = await Promise.all([
      supabase.from('delivery_orders').select('id', { count: 'exact', head: true })
        .eq('assigned_driver_id', dId).not('status', 'in', '("delivered","cancelled")'),
      supabase.from('delivery_orders').select('id', { count: 'exact', head: true })
        .eq('assigned_driver_id', dId).eq('status', 'delivered').gte('delivered_at', todayStart.toISOString()),
      supabase.from('delivery_orders').select('driver_earnings')
        .eq('assigned_driver_id', dId).eq('status', 'delivered'),
      supabase.from('delivery_orders').select('driver_earnings')
        .eq('assigned_driver_id', dId).eq('status', 'delivered').gte('delivered_at', weekStart.toISOString()),
      supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('profile_id', profile!.id).is('read_at', null),
    ]);

    if (cancelledRef.current) return;
    setActiveDeliveries(activeCount ?? 0);
    setCompletedToday(todayCount ?? 0);
    setTotalEarnings((earningsData ?? []).reduce((s, r) => s + (r.driver_earnings ?? 0), 0));
    setWeeklyDeliveries(weekData?.length ?? 0);
    setWeeklyEarnings((weekData ?? []).reduce((s, r) => s + (r.driver_earnings ?? 0), 0));
    setUnreadNotifCount(notifCount ?? 0);
  }, [profile]);

  const fetchAvailableOrders = useCallback(async () => {
    const { data } = await supabase
      .from('delivery_orders')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data && !cancelledRef.current) setAvailableOrders(data);
  }, []);

  useEffect(() => {
    if (!profile) return;
    cancelledRef.current = false;

    const init = async () => {
      try {
        const driver = await fetchDriverData();
        if (!driver || cancelledRef.current) return;
        await Promise.all([fetchStats(driver.id), fetchAvailableOrders()]);
        if (cancelledRef.current) return;

        channelRef.current = supabase.channel('driver-home-orders')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_orders', filter: 'status=eq.pending' }, (payload) => {
            setAvailableOrders((prev) => [payload.new as DeliveryOrders, ...prev]);
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders' }, (payload) => {
            const updated = payload.new as DeliveryOrders;
            setAvailableOrders((prev) => {
              if (updated.status !== 'pending') return prev.filter((o) => o.id !== updated.id);
              if (prev.some((o) => o.id === updated.id)) return prev.map((o) => o.id === updated.id ? updated : o);
              return [updated, ...prev];
            });
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_orders', filter: `assigned_driver_id=eq.${driver.id}` }, () => {
            fetchStats(driver.id);
          })
          .subscribe();
      } catch {
        // init failed — proceed to setLoading(false)
      }

      if (!cancelledRef.current) setLoading(false);
    };

    init();

    return () => {
      cancelledRef.current = true;
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [profile?.id, fetchDriverData, fetchStats, fetchAvailableOrders]);

  useFocusEffect(
    useCallback(() => {
      if (!driverId) return;
      (async () => {
        try {
          await Promise.all([fetchStats(driverId), fetchAvailableOrders()]);
        } catch {
          // background refresh failed
        }
      })();
    }, [driverId, fetchStats, fetchAvailableOrders])
  );

  const onRefresh = useCallback(async () => {
    if (!driverId) return;
    setRefreshing(true);
    try {
      await Promise.all([fetchStats(driverId), fetchAvailableOrders()]);
    } catch {
      // manual refresh failed
    }
    setRefreshing(false);
  }, [driverId, fetchStats, fetchAvailableOrders]);

  const toggleOnline = async () => {
    if (!driverId) return;
    const newStatus = !isOnline ? 'online' : 'offline';
    setIsOnline(!isOnline);
    await supabase.from('drivers').update({ availability: newStatus }).eq('id', driverId);
  };

  const ordersWithDistance = useMemo(() => {
    if (!driverRecord?.current_latitude) return availableOrders;
    return availableOrders.map((o) => {
      const dist = calculateDistance(
        driverRecord.current_latitude!, driverRecord.current_longitude!,
        o.pickup_latitude, o.pickup_longitude,
      );
      return { ...o, distance: parseFloat(dist.toFixed(1)) };
    });
  }, [availableOrders, driverRecord?.current_latitude, driverRecord?.current_longitude]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <DriverHeader
          name={profile?.full_name ?? 'Driver'}
          unreadCount={unreadNotifCount}
          isOnline={isOnline}
          onToggleOnline={toggleOnline}
        />
        <DriverStatsGrid
          activeDeliveries={activeDeliveries}
          completedToday={completedToday}
          earnings={totalEarnings}
          rating={driverRecord?.average_rating ?? 0}
        />
        <AvailableOrdersSection orders={ordersWithDistance} />
        <DriverQuickActions />
        <DriverPerformanceSummary weeklyDeliveries={weeklyDeliveries} weeklyEarnings={weeklyEarnings} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
