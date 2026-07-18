import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { DeliveryOrders, Stores } from '../../../src/types/database';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { ICONS } from '../../../src/constants/icons';

function fmtCurr(v: number): string {
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YER`;
}

function fmtPay(m: string): string {
  const map: Record<string, string> = { cash: 'Cash on Delivery', card: 'Card', wallet: 'Wallet' };
  return map[m] || m;
}

export default function DeliverySummaryScreen() {
  const colors = useColors();

  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const profile = useAuthStore((s) => s.profile);

  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [store, setStore] = useState<Stores | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!profile) {
        if (!cancelled) { setAccessError('Authentication required'); setLoading(false); }
        return;
      }

      const { data: driver } = await supabase.from('drivers').select('id').eq('profile_id', profile.id).maybeSingle();
      const driverId = driver?.id;

      const { data: o } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (!o) {
        if (!cancelled) { setAccessError('Order not found'); setLoading(false); }
        return;
      }

      if (o.status !== 'delivered') {
        if (!cancelled) { setAccessError(`This screen is only available after delivery is completed. Current status: ${o.status.replace(/_/g, ' ')}`); setLoading(false); }
        return;
      }

      if (driverId && o.assigned_driver_id !== driverId) {
        if (!cancelled) { setAccessError('You are not the assigned driver for this order'); setLoading(false); }
        return;
      }

      if (!cancelled) setOrder(o);

      const { data: s } = await supabase.from('stores').select('*').eq('id', o.store_id).single();
      if (s && !cancelled) setStore(s);

      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [orderId]);

  const handleGoHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(driver)');
  };

  const S = useMemo(() => StyleSheet.create({
    banner: {
      alignItems: 'center', paddingVertical: 28, marginBottom: spacing.sm,
    },
    bannerTitle: { color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginBottom: 6 },
    bannerSub: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center' },
    card: {
      backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm,
      borderWidth: 1, borderColor: colors.border,
    },
    cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    locRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
    locLabel: { color: colors.textSecondary, fontSize: fontSize.xxs, fontWeight: fontWeight.semibold, letterSpacing: 0.5, marginBottom: spacing.xs },
    locTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    dropPinSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.dangerLight, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
    custName: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
    custPhone: { color: colors.textSecondary, fontSize: fontSize.sm },
    payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    lbl: { color: colors.textSecondary, fontSize: fontSize.sm },
    val: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLbl: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    totalVal: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
    payMethodBadge: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.borderLight,
      paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginTop: spacing.sm, gap: spacing.sm,
    },
    payMethodText: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    homeBtn: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
    homeBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
    backBtn: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
    backBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Delivery Summary', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (accessError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Delivery Summary', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg }}>
          <MaterialIcons name={ICONS.warning} size={fontSize.xl} color={colors.warning} />
          <Text style={{ color: colors.text, fontSize: fontSize.md, textAlign: 'center', marginBottom: spacing.lg }}>{accessError}</Text>
          <TouchableOpacity style={S.backBtn} onPress={handleGoHome}>
            <Text style={S.backBtnText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Delivery Summary', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>Order not found</Text></View>
      </SafeAreaView>
    );
  }

  const bonus = order.reward_bonus ?? 0;
  const total = order.driver_earnings + bonus;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Delivery Summary', headerTitleStyle: { fontWeight: fontWeight.bold } }} />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        {/* Success Banner */}
        <View style={S.banner}>
          <MaterialIcons name={ICONS.checkCircle} size={fontSize.display} color={colors.success} />
          <Text style={S.bannerTitle}>Delivery Complete!</Text>
          <Text style={S.bannerSub}>Order {order.order_number} has been delivered successfully.</Text>
        </View>

        {/* Route */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Delivery Route</Text>
          <View style={S.locRow}>
            <MaterialIcons name={ICONS.store} size={fontSize.md} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={S.locLabel}>FROM</Text>
              <Text style={S.locTitle}>{store?.name || 'Store'}</Text>
            </View>
          </View>
          <View style={[S.locRow, { marginBottom: 0 }]}>
            <View style={S.dropPinSmall}><MaterialIcons name={ICONS.location} size={fontSize.xxs} color={colors.text} /></View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={S.locLabel}>TO</Text>
              <Text style={S.locTitle}>{order.delivery_address}</Text>
            </View>
          </View>
        </View>

        {/* Customer */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Customer</Text>
          <Text style={S.custName}>{order.customer_name}</Text>
          <Text style={S.custPhone}>{order.customer_phone}</Text>
        </View>

        {/* Earnings Breakdown */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Earnings Breakdown</Text>
          <View style={S.payRow}>
            <Text style={S.lbl}>Delivery Fee</Text>
            <Text style={S.val}>{fmtCurr(order.delivery_fee)}</Text>
          </View>
          <View style={S.payRow}>
            <Text style={S.lbl}>Platform Commission</Text>
            <Text style={S.val}>{fmtCurr(order.platform_commission)}</Text>
          </View>
          {bonus > 0 && (
            <View style={S.payRow}>
              <Text style={S.lbl}>Reward Bonus</Text>
              <Text style={S.val}>{fmtCurr(bonus)}</Text>
            </View>
          )}
          <View style={S.divider} />
          <View style={S.totalRow}>
            <Text style={S.totalLbl}>Driver Earnings</Text>
            <Text style={S.totalVal}>{fmtCurr(total)}</Text>
          </View>
          <View style={S.payMethodBadge}>
            <MaterialIcons name={ICONS.money} size={fontSize.lg} color={colors.textSecondary} />
            <Text style={S.payMethodText}>{fmtPay(order.payment_method)}</Text>
          </View>
        </View>

        {/* Home Button */}
        <TouchableOpacity style={S.homeBtn} onPress={handleGoHome}>
          <Text style={S.homeBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
