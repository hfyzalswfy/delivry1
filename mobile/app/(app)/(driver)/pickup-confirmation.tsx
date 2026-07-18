import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput, Image, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { arriveAtStore, confirmPickup } from '../../../src/services/delivery-service';
import { DeliveryOrders, Stores } from '../../../src/types/database';
import { calculateDistance } from '../../../src/lib/geo';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { ICONS } from '../../../src/constants/icons';

function fmtDist(km: number): string {
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`;
}

export default function PickupConfirmationScreen() {
  const colors = useColors();

  const BADGE: Record<string, { label: string; bg: string; text: string }> = {
    driver_arrived_store: { label: 'At Store', bg: colors.warningLight, text: colors.warning },
    driver_accepted: { label: 'Accepted', bg: colors.primaryLight, text: colors.primary },
    picked_up: { label: 'Picked Up', bg: colors.infoLight, text: colors.info },
  };

  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const profile = useAuthStore((s) => s.profile);

  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [store, setStore] = useState<Stores | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');

  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: o } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (!o || cancelled) { if (!cancelled) setLoading(false); return; }
      if (!cancelled) setOrder(o);

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

  const badge = order ? (BADGE[order.status] || { label: order.status.replace(/_/g, ' '), bg: colors.borderLight, text: colors.textSecondary }) : null;

  const handleCancel = () => { if (router.canGoBack()) router.back(); else router.replace('/(app)/(driver)'); };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Camera access is required to take delivery proof photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleUploadFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Photo library access is required to upload delivery proof photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleMarkPickedUp = async () => {
    if (!order || !driverId) return;
    setSaving(true);

    const { data: current } = await supabase
      .from('delivery_orders')
      .select('status, assigned_driver_id')
      .eq('id', orderId)
      .single();

    if (!current) {
      setSaving(false);
      Alert.alert('Error', 'Order not found.');
      return;
    }

    if (current.assigned_driver_id !== driverId) {
      setSaving(false);
      Alert.alert('Not Assigned', 'This order is not assigned to you.');
      return;
    }

    // If driver hasn't arrived at store yet, do that first
    if (current.status === 'driver_accepted') {
      const arriveResult = await arriveAtStore(orderId, driverId);
      if (!arriveResult.success) {
        setSaving(false);
        Alert.alert('Error', arriveResult.error || 'Failed to mark arrival at store.');
        return;
      }
    } else if (current.status !== 'driver_arrived_store') {
      setSaving(false);
      Alert.alert('Invalid Status', 'This order cannot be marked as picked up from its current state.');
      return;
    }

    const result = await confirmPickup(orderId, driverId, photoUri ?? undefined, notes || undefined);

    setSaving(false);
    if (result.success) {
      router.replace(`/(app)/(driver)/${orderId}`);
    } else {
      Alert.alert('Error', result.error || 'Failed to confirm pickup.');
    }
  };

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
    lbl: { color: colors.textSecondary, fontSize: fontSize.sm, width: 64 },
    val: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'right' },
    sml: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs, textAlign: 'right' },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    },
    badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
    distRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    distText: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    proofBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: colors.borderLight,
      marginBottom: spacing.sm,
    },
    proofBtnText: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    photoPreviewWrap: { alignItems: 'center', marginBottom: spacing.sm },
    photoPreview: { width: '100%', height: 200, borderRadius: borderRadius.md, marginBottom: spacing.sm },
    removePhotoBtn: { paddingVertical: 6 },
    removePhotoText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    sigPlaceholder: {
      borderWidth: 1.5,
      borderColor: colors.borderLight,
      borderStyle: 'dashed',
      borderRadius: borderRadius.md,
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 100,
    },
    sigLine: {
      width: '80%',
      height: 1,
      backgroundColor: colors.borderLight,
      marginBottom: 6,
    },
    sigPlaceholderText: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm, fontWeight: fontWeight.medium },
    notesInput: {
      backgroundColor: colors.borderLight,
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      color: colors.text,
      fontSize: fontSize.sm,
      minHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
    },
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

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Pickup Confirmation', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Pickup Confirmation', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Pickup Confirmation', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>

        {/* ────────── ORDER INFO CARD ────────── */}
        <View style={S.card}>
          <View style={S.row}>
            <Text style={S.lbl}>Order ID</Text>
            <Text style={S.val}>{order.order_number}</Text>
          </View>

          <View style={S.row}>
            <Text style={S.lbl}>Status</Text>
            {badge && (
              <View style={[S.badge, { backgroundColor: badge.bg }]}>
                <Text style={[S.badgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            )}
          </View>

          <View style={S.row}>
            <Text style={S.lbl}>Store</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={S.val}>{store?.name || 'Store'}</Text>
              <Text style={S.sml}>{order.pickup_address}</Text>
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

        {/* ────────── PICKUP PROOF CARD ────────── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Pickup Proof</Text>

          {/* Photo section */}
          {photoUri ? (
            <View style={S.photoPreviewWrap}>
              <Image source={{ uri: photoUri }} style={S.photoPreview} />
              <TouchableOpacity style={S.removePhotoBtn} onPress={() => setPhotoUri(null)}>
                <Text style={S.removePhotoText}>Remove Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity style={S.proofBtn} onPress={handleTakePhoto}>
                <MaterialIcons name={ICONS.camera} size={fontSize.lg} color={colors.text} />
                <Text style={S.proofBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.proofBtn} onPress={handleUploadFromGallery}>
                <MaterialIcons name={ICONS.photoLibrary} size={fontSize.lg} color={colors.text} />
                <Text style={S.proofBtnText}>Upload from Gallery</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={S.divider} />

          {/* Signature section - placeholder */}
          {/* TODO: Integrate react-native-signature-canvas for actual signature capture */}
          <TouchableOpacity style={S.sigPlaceholder} activeOpacity={0.9} onPress={() => Alert.alert('Coming Soon', 'Signature capture will be available in a future update.')}>
            <View style={S.sigLine} />
            <View style={S.sigLine} />
            <View style={S.sigLine} />
            <Text style={S.sigPlaceholderText}>Store Representative Signature</Text>
          </TouchableOpacity>
        </View>

        {/* ────────── NOTES CARD ────────── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Notes</Text>
          <TextInput
            style={S.notesInput}
            placeholder="Add any notes about the pickup..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>

        {/* ────────── CHECKBOX ────────── */}
        <TouchableOpacity style={S.chkRow} onPress={() => setConfirmed(!confirmed)} activeOpacity={0.7}>
          <View style={[S.chkBox, confirmed && S.chkBoxChecked]}>
            {confirmed && <MaterialIcons name={ICONS.check} size={fontSize.sm} color={colors.text} />}
          </View>
          <Text style={S.chkLabel}>I confirm I have collected this order from the store.</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ────────── FOOTER ────────── */}
      <View style={S.footer}>
        <TouchableOpacity
          style={[S.confirmBtn, (!confirmed || saving) && S.confirmBtnDisabled]}
          onPress={handleMarkPickedUp}
          disabled={!confirmed || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[S.confirmBtnText, (!confirmed || saving) && S.confirmBtnTextDisabled]}>
              Mark as Picked Up
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCancel} style={S.cancelBtn} disabled={saving}>
          <Text style={S.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
