import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput, Image, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { arriveAtStore, confirmPickup } from '../../../src/services/delivery-service';
import { DeliveryOrders, Stores } from '../../../src/types/database';
import { calculateDistance } from '../../../src/lib/geo';

const C = {
  screenBg: '#0E1212',
  cardBg: '#1A1D28',
  white: '#FFFFFF',
  nearWhite: '#F3F4F6',
  label: '#6B7280',
  green: '#22C55E',
  greenDark: '#064E3B',
  greenLight: '#4ADE80',
  border: '#2A2D3A',
  divider: '#2A2D3A',
  cardRadius: 12,
  disabledBg: '#2A2D3A',
  disabledText: '#6B7280',
};

const BADGE: Record<string, { label: string; bg: string; text: string }> = {
  driver_arrived_store: { label: 'At Store', bg: '#713F12', text: '#FBBF24' },
  driver_accepted: { label: 'Accepted', bg: '#064E3B', text: '#4ADE80' },
  picked_up: { label: 'Picked Up', bg: '#1E3A5F', text: '#60A5FA' },
};

function fmtDist(km: number): string {
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`;
}

export default function PickupConfirmationScreen() {
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

  const badge = order ? (BADGE[order.status] || { label: order.status.replace(/_/g, ' '), bg: C.disabledBg, text: C.label }) : null;

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

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Pickup Confirmation', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Pickup Confirmation', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: C.label, fontSize: 16 }}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
      <Stack.Screen options={{ title: 'Pickup Confirmation', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

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
                <Text style={{ fontSize: 14 }}>{'\u{1F4CD}'}</Text>
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
                <Text style={{ fontSize: 18 }}>{'\u{1F4F7}'}</Text>
                <Text style={S.proofBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.proofBtn} onPress={handleUploadFromGallery}>
                <Text style={{ fontSize: 18 }}>{'\u{1F5BC}'}</Text>
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
            placeholderTextColor={C.label}
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
            {confirmed && <Text style={S.chkMark}>{'\u{2713}'}</Text>}
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

const S = StyleSheet.create({
  card: {
    backgroundColor: C.cardBg,
    borderRadius: C.cardRadius,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  lbl: { color: C.label, fontSize: 14, width: 64 },
  val: { color: C.nearWhite, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  sml: { color: C.label, fontSize: 12, marginTop: 2, textAlign: 'right' },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  divider: { height: 1, backgroundColor: C.divider, marginVertical: 12 },

  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distText: { color: C.nearWhite, fontSize: 13, fontWeight: '500' },

  // Proof buttons
  proofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: C.disabledBg,
    marginBottom: 10,
  },
  proofBtnText: { color: C.nearWhite, fontSize: 15, fontWeight: '500' },

  photoPreviewWrap: { alignItems: 'center', marginBottom: 12 },
  photoPreview: { width: '100%', height: 200, borderRadius: 10, marginBottom: 8 },
  removePhotoBtn: { paddingVertical: 6 },
  removePhotoText: { color: C.label, fontSize: 14, fontWeight: '500' },

  // Signature
  sigPlaceholder: {
    borderWidth: 1.5,
    borderColor: C.disabledBg,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  sigLine: {
    width: '80%',
    height: 1,
    backgroundColor: C.disabledBg,
    marginBottom: 6,
  },
  sigPlaceholderText: { color: C.label, fontSize: 13, marginTop: 8, fontWeight: '500' },

  // Notes
  notesInput: {
    backgroundColor: C.disabledBg,
    borderRadius: 10,
    padding: 12,
    color: C.nearWhite,
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: C.border,
  },

  // Checkbox
  chkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  chkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.label,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chkBoxChecked: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  chkMark: { color: C.white, fontSize: 14, fontWeight: '700' },
  chkLabel: { color: C.white, fontSize: 15, fontWeight: '500', flex: 1 },

  // Footer
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    backgroundColor: C.screenBg,
  },
  confirmBtn: {
    backgroundColor: C.greenDark,
    borderRadius: C.cardRadius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: C.disabledBg },
  confirmBtnText: { color: C.greenLight, fontSize: 16, fontWeight: '700' },
  confirmBtnTextDisabled: { color: C.disabledText },

  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: { color: C.label, fontSize: 16, fontWeight: '600' },
});
