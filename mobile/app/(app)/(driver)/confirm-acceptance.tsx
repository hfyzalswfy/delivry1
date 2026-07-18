import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { DeliveryOrders, Stores } from '../../../src/types/database';
import { calculateDistance } from '../../../src/lib/geo';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { ICONS } from '../../../src/constants/icons';

function fmtCurr(v: number): string {
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YER`;
}

function fmtDist(km: number): string {
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`;
}

export default function ConfirmAcceptanceScreen() {
  const colors = useColors();

  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const profile = useAuthStore((s) => s.profile);

  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [store, setStore] = useState<Stores | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [redirectTarget]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: o } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (!o || cancelled) { if (!cancelled) setLoading(false); return; }
      if (!cancelled) setOrder(o);

      if (!cancelled && o.status !== 'pending') {
        setRedirectTarget(`/(app)/(driver)/${orderId}`);
        setLoading(false);
        return;
      }

      const { data: s } = await supabase.from('stores').select('*').eq('id', o.store_id).single();
      if (s && !cancelled) setStore(s);

      const { data: d } = await supabase.from('drivers').select('*').eq('profile_id', profile?.id).single();
      if (d && !cancelled) {
        setDriverId(d.id);
        setDriverLat(d.current_latitude);
        setDriverLng(d.current_longitude);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [orderId]);

  const distKm = useMemo(() => {
    if (!order || driverLat == null || driverLng == null) return null;
    return calculateDistance(driverLat, driverLng, order.pickup_latitude, order.pickup_longitude);
  }, [order, driverLat, driverLng]);

  const bonus = order?.reward_bonus ?? 0;
  const total = (order?.driver_earnings ?? 0) + bonus;

  const S = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    lbl: { color: colors.textSecondary, fontSize: fontSize.sm, width: 80 },
    val: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'right' },
    sml: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs, textAlign: 'right' },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
    distRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    distText: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    payRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalLbl: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    totalVal: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
    chkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      marginBottom: spacing.md,
    },
    chkBox: {
      width: 24,
      height: 24,
      borderRadius: borderRadius.sm,
      borderWidth: 2,
      borderColor: colors.textSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    chkBoxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chkMark: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    chkLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1 },
    footer: {
      padding: spacing.md,
      paddingBottom: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    confirmBtn: {
      backgroundColor: colors.primaryLight,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    confirmBtnDisabled: { backgroundColor: colors.borderLight },
    confirmBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
    confirmBtnTextDisabled: { color: colors.disabled },
    cancelBtn: {
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    cancelBtnText: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  }), [colors]);

  const handleCancel = () => {
    if (router.canGoBack()) router.back(); else router.replace('/(app)/(driver)');
  };

  const handleConfirm = async () => {
    if (!order || !driverId || !profile) return;
    setAccepting(true);

    try {
      const { data, error } = await supabase.rpc('accept_order', {
        p_order_id: orderId,
        p_driver_id: driverId,
      });

      if (error) {
        Alert.alert('Error', error.message);
        setAccepting(false);
        return;
      }

      const result = data as { success: boolean; code?: string; error?: string };
      if (!result.success) {
        Alert.alert('Cannot Accept', result.error || 'Order may have been taken by another driver.');
        setAccepting(false);
        return;
      }

      setAccepting(false);
      router.replace(`/(app)/(driver)/${orderId}`);
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Confirm Acceptance', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Confirm Acceptance', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Confirm Acceptance', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>

        {/* ────────── ORDER SUMMARY CARD ────────── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Order Summary</Text>

          <View style={S.row}>
            <Text style={S.lbl}>Order ID</Text>
            <Text style={S.val}>{order.order_number}</Text>
          </View>

          <View style={S.row}>
            <Text style={S.lbl}>Pickup</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={S.val}>{store?.name || 'Store'}</Text>
              <Text style={S.sml}>{order.pickup_address}</Text>
            </View>
          </View>

          <View style={[S.row, { borderBottomWidth: 0 }]}>
            <Text style={S.lbl}>Drop-off</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={S.val}>{order.delivery_address}</Text>
            </View>
          </View>

          {distKm != null && (
            <>
              <View style={S.divider} />
              <View style={S.distRow}>
                <MaterialIcons name={ICONS.location} size={fontSize.sm} color={colors.text} />
                <Text style={S.distText}>{fmtDist(distKm)} from your location</Text>
              </View>
            </>
          )}
        </View>

        {/* ────────── PAYMENT SUMMARY CARD ────────── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Payment Summary</Text>

          <View style={S.payRow}>
            <Text style={S.lbl}>Delivery Fee</Text>
            <Text style={S.val}>{fmtCurr(order.delivery_fee)}</Text>
          </View>

          {bonus > 0 && (
            <View style={S.payRow}>
              <Text style={S.lbl}>Reward</Text>
              <Text style={S.val}>{fmtCurr(bonus)}</Text>
            </View>
          )}

          <View style={S.divider} />

          <View style={S.totalRow}>
            <Text style={S.totalLbl}>Estimated Total</Text>
            <Text style={S.totalVal}>{fmtCurr(total)}</Text>
          </View>
        </View>

        {/* ────────── CHECKBOX ────────── */}
        <TouchableOpacity style={S.chkRow} onPress={() => setConfirmed(!confirmed)} activeOpacity={0.7}>
          <View style={[S.chkBox, confirmed && S.chkBoxChecked]}>
            {confirmed && <MaterialIcons name={ICONS.check} size={fontSize.sm} color={colors.text} />}
          </View>
          <Text style={S.chkLabel}>I am available to complete this delivery</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ────────── FOOTER ────────── */}
      <View style={S.footer}>
        <TouchableOpacity
          style={[S.confirmBtn, !confirmed && S.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!confirmed || accepting}
        >
          {accepting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[S.confirmBtnText, !confirmed && S.confirmBtnTextDisabled]}>
              Confirm & Accept Order
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCancel} style={S.cancelBtn} disabled={accepting}>
          <Text style={S.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
