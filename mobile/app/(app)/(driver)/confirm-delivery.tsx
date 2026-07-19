import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, Alert, Image } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { completeDelivery } from '../../../src/services/delivery-service';
import { DeliveryOrders, Stores } from '../../../src/types/database';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { ICONS } from '../../../src/constants/icons';

function fmtCurr(v: number): string {
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YER`;
}

export default function ConfirmDeliveryScreen() {
  const colors = useColors();

  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const profile = useAuthStore((s) => s.profile);
  const navigatedRef = useRef(false);

  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [store, setStore] = useState<Stores | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [otpValue, setOtpValue] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const hasOtp = !!(order?.otp_code);
  const bonus = order?.reward_bonus ?? 0;
  const total = (order?.driver_earnings ?? 0) + bonus;

  const goToSummary = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace(`/(app)/(driver)/delivery-summary?orderId=${orderId}`);
  };

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      if (!profile) {
        if (!cancelled) { setAccessError('Authentication required'); setLoading(false); }
        return;
      }

      const { data: driver } = await supabase.from('drivers').select('id').eq('profile_id', profile.id).maybeSingle();
      if (!driver) {
        if (!cancelled) { setAccessError('Driver profile not found'); setLoading(false); }
        return;
      }
      if (!cancelled) setDriverId(driver.id);

      const { data: o } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (!o) {
        if (!cancelled) { setAccessError('Order not found'); setLoading(false); }
        return;
      }

      // If already delivered, navigate immediately
      if (o.status === 'delivered') {
        if (!cancelled) { goToSummary(); }
        return;
      }

      if (o.status !== 'driver_arrived_destination') {
        if (!cancelled) { setAccessError(`This screen is only available when the order status is "Arrived at Destination". Current status: ${o.status.replace(/_/g, ' ')}`); setLoading(false); }
        return;
      }

      if (o.assigned_driver_id !== driver.id) {
        if (!cancelled) { setAccessError('You are not the assigned driver for this order'); setLoading(false); }
        return;
      }

      if (!cancelled) setOrder(o);

      const { data: s } = await supabase.from('stores').select('*').eq('id', o.store_id).single();
      if (s && !cancelled) setStore(s);

      if (cancelled) { setLoading(false); return; }

      channel = supabase.channel(`confirm-delivery-${orderId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `id=eq.${orderId}` }, (p) => {
          const updated = p.new as DeliveryOrders;
          setOrder(updated);
          if (updated.status === 'delivered' && !cancelled) {
            goToSummary();
          }
        })
        .subscribe();

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId]);

  const handleCompleteDelivery = async () => {
    if (!order || !driverId) return;
    setCompleting(true);

    try {
      let method: 'otp' | 'photo' | 'signature' | 'none' = 'none';
      let data: string | undefined;

      if (hasOtp) {
        method = 'otp';
        data = otpValue;
      } else if (photoUri) {
        method = 'photo';
        data = photoUri;
      }

      const result = await completeDelivery(orderId, driverId, method, data);

      setCompleting(false);
      if (result.success) {
        goToSummary();
      } else {
        Alert.alert('Delivery Failed', result.error);
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setCompleting(false);
    }
  };

  const handleReportIssue = () => {
    router.push(`/(app)/(driver)/report-issue?orderId=${orderId}`);
  };

  const S = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm,
      borderWidth: 1, borderColor: colors.border,
    },
    cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    cardNumber: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    orderNumber: { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md },
    locRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
    locLabel: { color: colors.textSecondary, fontSize: fontSize.xxs, fontWeight: fontWeight.semibold, letterSpacing: 0.5, marginBottom: spacing.xs },
    locTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    dropPinSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.dangerLight, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
    payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    lbl: { color: colors.textSecondary, fontSize: fontSize.sm },
    val: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLbl: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    totalVal: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
    verifLabel: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.md },
    otpSection: { marginBottom: spacing.md },
    otpLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
    otpInput: {
      backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
      padding: spacing.sm, fontSize: fontSize.xxl, color: colors.text, textAlign: 'center', letterSpacing: 8,
      fontWeight: fontWeight.bold,
    },
    photoBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.background, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border,
      borderStyle: 'dashed', paddingVertical: spacing.lg, gap: spacing.sm,
    },
    photoBtnText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    signatureBox: {
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.background, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border,
      borderStyle: 'dashed', paddingVertical: spacing.lg, gap: spacing.sm,
    },
    signatureLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    signatureNote: { color: colors.textSecondary, fontSize: fontSize.xs },
    completeBtn: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
    completeBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
    reportBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: spacing.sm, marginTop: spacing.sm, gap: spacing.sm,
    },
    reportBtnText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    backBtn: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
    backBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Confirm Delivery', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (accessError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Confirm Delivery', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg }}>
          <MaterialIcons name={ICONS.warning} size={fontSize.xl} color={colors.warning} />
          <Text style={{ color: colors.text, fontSize: fontSize.md, textAlign: 'center', marginBottom: spacing.lg }}>{accessError}</Text>
          <TouchableOpacity style={S.backBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(app)/(driver)'); }}>
            <Text style={S.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Confirm Delivery', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>Order not found</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Confirm Delivery', headerTitleStyle: { fontWeight: fontWeight.bold } }} />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        {/* Order Info */}
        <View style={S.card}>
          <Text style={S.orderNumber}>{order.order_number}</Text>
          <View style={S.locRow}>
            <MaterialIcons name={ICONS.store} size={fontSize.md} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={S.locLabel}>PICKUP</Text>
              <Text style={S.locTitle}>{store?.name || 'Store'}</Text>
            </View>
          </View>
          <View style={[S.locRow, { marginBottom: 0 }]}>
            <View style={S.dropPinSmall}><MaterialIcons name={ICONS.location} size={fontSize.xxs} color={colors.text} /></View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={S.locLabel}>DROP-OFF</Text>
              <Text style={S.locTitle}>{order.delivery_address}</Text>
            </View>
          </View>
        </View>

        {/* Payment Summary */}
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
            <Text style={S.totalLbl}>Total Earnings</Text>
            <Text style={S.totalVal}>{fmtCurr(total)}</Text>
          </View>
        </View>

        {/* Verification */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Verification</Text>
          <Text style={S.verifLabel}>Please verify delivery to complete the order.</Text>

          {/* OTP */}
          {hasOtp && (
            <View style={S.otpSection}>
              <Text style={S.otpLabel}>Enter OTP</Text>
              <TextInput
                style={S.otpInput}
                value={otpValue}
                onChangeText={setOtpValue}
                placeholder="000000"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          )}

          {/* Photo */}
          {!hasOtp && !order.proof_signature_url && (
            <>
              {photoUri ? (
                <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
                  <Image source={{ uri: photoUri }} style={{ width: '100%', height: 180, borderRadius: borderRadius.md, marginBottom: spacing.sm }} />
                  <TouchableOpacity onPress={() => setPhotoUri(null)}>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>Remove Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={S.photoBtn} onPress={async () => {
                  const permission = await ImagePicker.requestCameraPermissionsAsync();
                  if (!permission.granted) { Alert.alert('Permission Denied', 'Camera access is required to take delivery proof photos.'); return; }
                  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
                  if (!result.canceled && result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
                }}>
                  <MaterialIcons name={ICONS.camera} size={fontSize.xxl} color={colors.textSecondary} />
                  <Text style={S.photoBtnText}>Take Delivery Photo</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Signature placeholder */}
          {!hasOtp && order.proof_signature_url && (
            <View style={S.signatureBox}>
              <MaterialIcons name={ICONS.edit} size={fontSize.xxl} color={colors.textSecondary} />
              <Text style={S.signatureLabel}>Customer Signature</Text>
              <Text style={S.signatureNote}>Signature captured online</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <TouchableOpacity style={S.completeBtn} onPress={handleCompleteDelivery} disabled={completing || (hasOtp && otpValue.length < 4)}>
          {completing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={S.completeBtnText}>Complete Delivery</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={S.reportBtn} onPress={handleReportIssue}>
          <MaterialIcons name={ICONS.warning} size={fontSize.md} color={colors.textSecondary} />
          <Text style={S.reportBtnText}>Report a Problem</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
