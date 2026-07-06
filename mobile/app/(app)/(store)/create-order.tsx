import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Dimensions, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../../src/theme/spacing';

export default function CreateOrderScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(false);
  const [shipmentTypes, setShipmentTypes] = useState<{ id: string; name: string }[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLat, setDeliveryLat] = useState('');
  const [deliveryLng, setDeliveryLng] = useState('');

  const [selectedShipment, setSelectedShipment] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 24.7136,
    longitude: 46.6753,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    supabase.from('shipment_types').select('id, name').eq('is_active', true).then(({ data }) => {
      if (data) setShipmentTypes(data);
    });
  }, []);

  const useCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = loc.coords;
    setPickupLat(latitude.toFixed(6));
    setPickupLng(longitude.toFixed(6));
    setMapRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
    mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
    const addr = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (addr[0]) {
      const parts = [addr[0].street, addr[0].city, addr[0].region].filter(Boolean);
      setPickupAddress(parts.join(', '));
    }
  };

  const handleMapLongPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setDeliveryLat(latitude.toFixed(6));
    setDeliveryLng(longitude.toFixed(6));
    const addr = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (addr[0]) {
      const parts = [addr[0].street, addr[0].city, addr[0].region].filter(Boolean);
      setDeliveryAddress(parts.join(', '));
    }
  };

  const handleCreate = async () => {
    setError('');
    const fee = parseFloat(deliveryFee);
    if (!customerName || !customerPhone || !pickupAddress || !deliveryAddress || !deliveryFee || isNaN(fee) || fee <= 0) {
      setError('Please fill in all required fields and set a valid delivery fee');
      return;
    }

    setLoading(true);

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', profile?.id)
      .single();

    if (!store) {
      setError('Store profile not found');
      setLoading(false);
      return;
    }

    const { data: customerId } = await supabase.rpc('ensure_customer_by_phone', {
      p_phone: customerPhone,
      p_name: customerName,
    });

    const { error: createError } = await supabase.from('delivery_orders').insert({
      store_id: store.id,
      created_by: profile!.id,
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone,
      pickup_address: pickupAddress,
      pickup_latitude: parseFloat(pickupLat) || 0,
      pickup_longitude: parseFloat(pickupLng) || 0,
      delivery_address: deliveryAddress,
      delivery_latitude: parseFloat(deliveryLat) || 0,
      delivery_longitude: parseFloat(deliveryLng) || 0,
      shipment_type_id: selectedShipment || null,
      shipment_description: description || null,
      delivery_fee: fee,
      platform_commission: 0,
      driver_earnings: 0,
      status: 'pending',
      payment_method: 'cash',
      priority: 'normal',
    });

    setLoading(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Pickup & Delivery Map</Text>
      <Text style={styles.hint}>Long press on the map to set delivery location</Text>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          mapType="standard"
          loadingEnabled
          region={mapRegion}
          onLongPress={handleMapLongPress}
        >
          {pickupLat && pickupLng && !isNaN(parseFloat(pickupLat)) && (
            <Marker coordinate={{ latitude: parseFloat(pickupLat), longitude: parseFloat(pickupLng) }} title="Pickup" pinColor="green" />
          )}
          {deliveryLat && deliveryLng && !isNaN(parseFloat(deliveryLat)) && (
            <Marker coordinate={{ latitude: parseFloat(deliveryLat), longitude: parseFloat(deliveryLng) }} title="Delivery" pinColor="red" />
          )}
        </MapView>
        <TouchableOpacity style={styles.currentLocButton} onPress={useCurrentLocation}>
          <Text style={styles.currentLocText}>📍 My Location</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Customer Information</Text>
      <Text style={styles.label}>Customer Name *</Text>
      <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Recipient name" />
      <Text style={styles.label}>Customer Phone *</Text>
      <TextInput style={styles.input} value={customerPhone} onChangeText={setCustomerPhone} placeholder="+1234567890" keyboardType="phone-pad" />

      <Text style={styles.sectionTitle}>Pickup Address</Text>
      <Text style={styles.label}>Address *</Text>
      <TextInput style={styles.input} value={pickupAddress} onChangeText={setPickupAddress} placeholder="Pickup location" />
      <TouchableOpacity style={styles.toggleManual} onPress={() => setShowManual(!showManual)}>
        <Text style={styles.toggleManualText}>{showManual ? 'Hide' : 'Show'} manual coordinates input</Text>
      </TouchableOpacity>

      {showManual && (
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput style={styles.input} value={pickupLat} onChangeText={setPickupLat} placeholder="0.0" keyboardType="decimal-pad" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput style={styles.input} value={pickupLng} onChangeText={setPickupLng} placeholder="0.0" keyboardType="decimal-pad" />
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Delivery Address</Text>
      <Text style={styles.label}>Address *</Text>
      <TextInput style={styles.input} value={deliveryAddress} onChangeText={setDeliveryAddress} placeholder="Delivery location" />

      {showManual && (
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput style={styles.input} value={deliveryLat} onChangeText={setDeliveryLat} placeholder="0.0" keyboardType="decimal-pad" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput style={styles.input} value={deliveryLng} onChangeText={setDeliveryLng} placeholder="0.0" keyboardType="decimal-pad" />
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Delivery Details</Text>
      <Text style={styles.label}>Shipment Type</Text>
      <View style={styles.shipmentRow}>
        {shipmentTypes.map((st) => (
          <TouchableOpacity
            key={st.id}
            style={[styles.shipmentCard, selectedShipment === st.id && styles.shipmentCardActive]}
            onPress={() => setSelectedShipment(st.id)}
          >
            <Text style={[styles.shipmentName, selectedShipment === st.id && styles.shipmentNameActive]}>
              {st.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="What's being delivered?" multiline numberOfLines={3} />

      <Text style={styles.label}>Delivery Fee *</Text>
      <TextInput style={styles.input} value={deliveryFee} onChangeText={setDeliveryFee} placeholder="0.00" keyboardType="decimal-pad" />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Order</Text>}
      </TouchableOpacity>

      <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  mapContainer: { position: 'relative', borderRadius: borderRadius.md, overflow: 'hidden' },
  map: { width: '100%', height: 280, borderRadius: borderRadius.md },
  currentLocButton: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: colors.surface, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  currentLocText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  toggleManual: { marginTop: spacing.md, paddingVertical: spacing.sm },
  toggleManualText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary, textAlign: 'center' },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.md, backgroundColor: colors.surface },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  shipmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shipmentCard: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm, alignItems: 'center', minWidth: 80, backgroundColor: colors.surface },
  shipmentCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  shipmentName: { fontSize: fontSize.sm, fontWeight: '500', color: colors.text },
  shipmentNameActive: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.sm },
  button: { backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
});
