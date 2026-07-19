import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useColors } from '../../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight, shadow } from '../../../../src/theme/spacing';
import { ICONS } from '../../../../src/constants/icons';
import { supabase } from '../../../../src/lib/supabase';
import { useAuthStore } from '../../../../src/store/auth-store';
import { useCreateOrderStore } from '../../../../src/store/create-order-store';
import { isValidCoordinate } from '../../../../src/lib/geo';
import SharedMap from '../../../../src/components/ui/SharedMap';
import OrderReviewCard from '../../../../src/components/OrderReviewCard';
import type { ReviewSection, ReviewOrderData } from '../../../../src/components/OrderReviewCard';

export default function ReviewScreen() {
  const colors = useColors();
  const store = useCreateOrderStore();
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pickupModalVisible, setPickupModalVisible] = useState(false);
  const [pickupPickerVisible, setPickupPickerVisible] = useState(false);

  useEffect(() => {
    if (!store.customerName || !store.deliveryFee) {
      router.replace('/(app)/(store)/create-order');
    }
  }, []);

  const handleEdit = (section: ReviewSection) => {
    switch (section) {
      case 'customer':
        router.push('/(app)/(store)/create-order');
        break;
      case 'pickup':
        setPickupModalVisible(true);
        break;
      case 'delivery':
        if (store.isExistingCustomer) {
          router.push('/(app)/(store)/create-order/select-address');
        } else {
          router.push('/(app)/(store)/create-order/location-picker');
        }
        break;
      case 'details':
        router.push('/(app)/(store)/create-order/order-details');
        break;
    }
  };

  // isValidCoordinate imported from geo.ts used below

  const handleOverrideStore = useCallback(async () => {
    setPickupModalVisible(false);
    setLoading(true);
    const { data: storeData } = await supabase
      .from('stores')
      .select('name, address, latitude, longitude')
      .eq('owner_id', profile?.id)
      .single();
    setLoading(false);
    if (storeData?.latitude && storeData?.longitude) {
      store.setPickup({
        address: storeData.address || storeData.name || 'Store',
        lat: Number(storeData.latitude),
        lng: Number(storeData.longitude),
        source: 'store',
      });
    } else {
      Alert.alert('Store Address Missing', 'Please set your store address in Profile > Store Address.');
    }
  }, [profile?.id, store]);

  const handleOverrideCurrent = useCallback(async () => {
    setPickupModalVisible(false);
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use current location.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;
      let addr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      try {
        const result = await Promise.race([
          Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
        ]);
        if (result && result[0]) {
          const parts = [result[0].street, result[0].city, result[0].region].filter(Boolean);
          addr = parts.join(', ');
        }
      } catch { /* use coordinates as address */ }
      store.setPickup({ address: addr, lat, lng, source: 'current_location' });
    } catch {
      Alert.alert('Error', 'Failed to get current location.');
    }
    setLoading(false);
  }, [store]);

  const handleOverrideCustom = useCallback((lat: number, lng: number, addressText: string) => {
    setPickupPickerVisible(false);
    store.setPickup({ address: addressText, lat, lng, source: 'custom' });
  }, [store]);

  const handleCreate = async () => {
    setLoading(true);
    setError('');

    if (!isValidCoordinate(store.pickupLat, store.pickupLng)) {
      setError('Pickup location coordinates are invalid. Please check your store address.');
      setLoading(false);
      return;
    }
    if (!isValidCoordinate(store.deliveryLat, store.deliveryLng)) {
      setError('Delivery location coordinates are invalid. Please set a valid delivery location.');
      setLoading(false);
      return;
    }

    try {
      const { data: storeRecord } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', profile?.id)
        .single();

      if (!storeRecord) {
        setError('Store profile not found');
        setLoading(false);
        return;
      }

      const { data: customerId } = await supabase.rpc('ensure_customer_by_phone', {
        p_phone: store.customerPhone,
        p_name: store.customerName,
      });

      const { error: createError } = await supabase.from('delivery_orders').insert({
        store_id: storeRecord.id,
        created_by: profile!.id,
        customer_id: customerId,
        customer_name: store.customerName,
        customer_phone: store.customerPhone,
        pickup_address: store.pickupAddress,
        pickup_latitude: store.pickupLat!,
        pickup_longitude: store.pickupLng!,
        delivery_address: store.deliveryAddress,
        delivery_latitude: store.deliveryLat!,
        delivery_longitude: store.deliveryLng!,
        delivery_apartment: store.deliveryApartment || null,
        delivery_floor: store.deliveryFloor || null,
        delivery_landmark: store.deliveryLandmark || null,
        delivery_notes: store.deliveryNotes || null,
        shipment_type_id: store.shipmentTypeId || null,
        shipment_description: store.shipmentDescription || null,
        shipment_weight_kg: store.shipmentWeightKg ? parseFloat(store.shipmentWeightKg) : null,
        notes_for_driver: store.notesForDriver || null,
        delivery_fee: parseFloat(store.deliveryFee) || 0,
        platform_commission: 0,
        driver_earnings: 0,
        status: 'pending',
        payment_method: store.paymentMethod,
        priority: store.priority,
      });

      if (createError) {
        setError(createError.message);
        setLoading(false);
        return;
      }

      store.reset();
      router.replace('/(app)/(store)');
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Creating order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const shipmentTypeName = store.shipmentTypeId ? 'Selected' : undefined;

  const reviewData: ReviewOrderData = {
    customerName: store.customerName,
    customerPhone: store.customerPhone,
    pickupAddress: store.pickupAddress,
    pickupLat: store.pickupLat ?? 0,
    pickupLng: store.pickupLng ?? 0,
    deliveryAddress: store.deliveryAddress,
    deliveryLat: store.deliveryLat ?? 0,
    deliveryLng: store.deliveryLng ?? 0,
    deliveryApartment: store.deliveryApartment || undefined,
    deliveryFloor: store.deliveryFloor || undefined,
    deliveryLandmark: store.deliveryLandmark || undefined,
    deliveryNotes: store.deliveryNotes || undefined,
    shipmentTypeName,
    shipmentDescription: store.shipmentDescription || undefined,
    deliveryFee: parseFloat(store.deliveryFee) || 0,
    paymentMethod: store.paymentMethod,
    priority: store.priority,
    notesForDriver: store.notesForDriver || undefined,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Text style={[styles.title, { color: colors.text }]}>Review Order</Text>

        <OrderReviewCard orderData={reviewData} onEdit={handleEdit} />

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={() => {
              Alert.alert('Discard Order', 'Are you sure you want to discard this order?', [
                { text: 'Keep Editing', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => { store.reset(); router.replace('/(app)/(store)'); } },
              ]);
            }}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Discard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={handleCreate}
          >
            <MaterialIcons name={ICONS.check} size={fontSize.md} color="#fff" />
            <Text style={styles.createBtnText}>Create Order</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={pickupModalVisible} transparent animationType="slide" onRequestClose={() => setPickupModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Pickup Location Override</Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              Current: {store.pickupOverrideSource === 'store' ? 'Store Address' : store.pickupOverrideSource === 'current_location' ? 'Current Location' : 'Custom'}
            </Text>

            <TouchableOpacity style={[styles.optionRow, { borderColor: colors.border }]} onPress={handleOverrideStore}>
              <MaterialIcons name={ICONS.store} size={fontSize.lg} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Store Address</Text>
                <Text style={[styles.optionSub, { color: colors.textTertiary }]}>Use your store's primary pickup location</Text>
              </View>
              {store.pickupOverrideSource === 'store' && (
                <MaterialIcons name={ICONS.check} size={fontSize.md} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionRow, { borderColor: colors.border }]} onPress={handleOverrideCurrent}>
              <MaterialIcons name={ICONS.location} size={fontSize.lg} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Current Location</Text>
                <Text style={[styles.optionSub, { color: colors.textTertiary }]}>Use your device's current location</Text>
              </View>
              {store.pickupOverrideSource === 'current_location' && (
                <MaterialIcons name={ICONS.check} size={fontSize.md} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionRow, { borderColor: colors.border }]}
              onPress={() => { setPickupModalVisible(false); setPickupPickerVisible(true); }}
            >
              <MaterialIcons name={ICONS.map} size={fontSize.lg} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Choose Another Location</Text>
                <Text style={[styles.optionSub, { color: colors.textTertiary }]}>Pick a custom location on the map</Text>
              </View>
              {store.pickupOverrideSource === 'custom' && (
                <MaterialIcons name={ICONS.check} size={fontSize.md} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.closeBtn, { borderColor: colors.border }]}
              onPress={() => setPickupModalVisible(false)}
            >
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {pickupPickerVisible && (
        <PickupPickerInline
          onConfirm={(lat, lng, addr) => handleOverrideCustom(lat, lng, addr)}
          onCancel={() => setPickupPickerVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

function PickupPickerInline({
  onConfirm, onCancel,
}: {
  onConfirm: (lat: number, lng: number, addressText: string) => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  const [lat, setLat] = useState(15.3694);
  const [lng, setLng] = useState(44.1910);
  const [confirmed, setConfirmed] = useState(false);
  const [addr, setAddr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLat(loc.coords.latitude);
          setLng(loc.coords.longitude);
          setConfirmed(true);
        } catch { /* user must interact */ }
      }
    })();
  }, []);

  const reverseGeocode = useCallback(async (latitude: number, longitude: number) => {
    try {
      const result = await Promise.race([
        Location.reverseGeocodeAsync({ latitude, longitude }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      if (result && result[0]) {
        const parts = [result[0].street, result[0].city, result[0].region].filter(Boolean);
        setAddr(parts.join(', '));
      } else {
        setAddr(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch {
      setAddr(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);
      setConfirmed(true);
      await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
    } catch { /* fail silently */ }
    setLoading(false);
  }, [reverseGeocode]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <SharedMap
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        onLongPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          setLat(latitude);
          setLng(longitude);
          setConfirmed(true);
          reverseGeocode(latitude, longitude);
        }}
        loadingEnabled
      >
        {isValidCoordinate(lat, lng) && (
          <Marker
            coordinate={{ latitude: lat, longitude: lng }}
            draggable
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setLat(latitude);
              setLng(longitude);
              setConfirmed(true);
              reverseGeocode(latitude, longitude);
            }}
          />
        )}
      </SharedMap>

      <TouchableOpacity
        style={[styles.currentLocBtn, { backgroundColor: '#fff', borderColor: '#ccc', ...shadow.md }]}
        onPress={handleUseCurrentLocation}
        disabled={loading}
      >
        {loading ? <ActivityIndicator size="small" color="#22C55E" /> : <MaterialIcons name={ICONS.location} size={24} color="#22C55E" />}
      </TouchableOpacity>

      <View style={[styles.pickerBottomSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Text style={[styles.pickerCoordText, { color: colors.text }]}>
          {confirmed ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Long press on the map to set a pin'}
        </Text>
        <View style={styles.pickerButtonRow}>
          <TouchableOpacity style={[styles.pickerCancelBtn, { borderColor: colors.border }]} onPress={onCancel}>
            <Text style={[styles.pickerCancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pickerConfirmBtn, { backgroundColor: colors.primary }, (!confirmed) && { opacity: 0.5 }]}
            onPress={() => confirmed && onConfirm(lat, lng, addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)}
            disabled={!confirmed}
          >
            <MaterialIcons name={ICONS.check} size={fontSize.md} color="#fff" />
            <Text style={styles.pickerConfirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  error: {
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  createBtn: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  createBtnText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  modalHint: {
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  optionSub: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  closeBtn: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  closeBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  currentLocBtn: {
    position: 'absolute',
    bottom: 180,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  pickerBottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  pickerCoordText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  pickerButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickerCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  pickerCancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  pickerConfirmBtn: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  pickerConfirmText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
