import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth-store';
import { supabase } from '../../src/lib/supabase';
import { useColors } from '../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight, shadow } from '../../src/theme/spacing';
import { ICONS } from '../../src/constants/icons';
import { isValidCoordinate } from '../../src/lib/geo';
import SharedMap from '../../src/components/ui/SharedMap';

export default function SetupScreen() {
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const colors = useColors();
  const styles = useStyles();

  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeLat, setStoreLat] = useState<number | null>(null);
  const [storeLng, setStoreLng] = useState<number | null>(null);
  const [showStorePicker, setShowStorePicker] = useState(false);

  const [vehicleType, setVehicleType] = useState('car');
  const [vehiclePlate, setVehiclePlate] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const role = profile?.role;

  const handleSetup = async () => {
    setError('');
    setLoading(true);

    if (role === 'store') {
      if (!storeName) { setError('Store name is required'); if (mountedRef.current) setLoading(false); return; }
      const { error: err } = await supabase.from('stores').insert({
        owner_id: profile!.id,
        name: storeName,
        phone: storePhone || null,
        address: storeAddress || null,
        latitude: storeLat,
        longitude: storeLng,
      });
      if (err) { if (mountedRef.current) { setError(err.message); setLoading(false); } return; }
    } else if (role === 'driver') {
      if (!vehiclePlate) { setError('Vehicle plate is required'); if (mountedRef.current) setLoading(false); return; }
      const { error: err } = await supabase.from('drivers').insert({
        profile_id: profile!.id,
        vehicle_type: vehicleType,
        vehicle_plate: vehiclePlate,
        availability: 'offline',
      });
      if (err) { if (mountedRef.current) { setError(err.message); setLoading(false); } return; }
    } else if (role === 'customer') {
      if (!customerName || !customerPhone) { setError('Name and phone are required'); if (mountedRef.current) setLoading(false); return; }
      const { error: err } = await supabase.from('customers').insert({
        profile_id: profile!.id,
        full_name: customerName,
        phone: customerPhone,
      });
      if (err) { if (mountedRef.current) { setError(err.message); setLoading(false); } return; }
    }

    await refreshProfile();
    if (mountedRef.current) setLoading(false);
  };

  if (!role) return null;

  if (showStorePicker) {
    return (
      <LocationPickerSetup
        initialLat={storeLat}
        initialLng={storeLng}
        onConfirm={(lat, lng, addr) => {
          setStoreLat(lat);
          setStoreLng(lng);
          setStoreAddress(addr);
          setShowStorePicker(false);
        }}
        onCancel={() => setShowStorePicker(false)}
      />
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>Set up your {role} account to get started</Text>

      {role === 'store' && (
        <>
          <Text style={styles.label}>Store Name *</Text>
          <TextInput style={styles.input} value={storeName} onChangeText={setStoreName} placeholder="My Store" />
          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={storePhone} onChangeText={setStorePhone} placeholder="+1234567890" keyboardType="phone-pad" />
          <Text style={styles.label}>Store Location</Text>
          <TextInput style={styles.input} value={storeAddress} onChangeText={setStoreAddress} placeholder="Street, city, area" />
          <TouchableOpacity
            style={[styles.pickOnMap, { borderColor: colors.border }]}
            onPress={() => setShowStorePicker(true)}
          >
            <MaterialIcons name={ICONS.location} size={fontSize.md} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={[styles.pickOnMapTitle, { color: colors.text }]}>
                {isValidCoordinate(storeLat, storeLng)
                  ? `${storeLat!.toFixed(6)}, ${storeLng!.toFixed(6)}`
                  : 'Set Location on Map'}
              </Text>
              <Text style={[styles.pickOnMapHint, { color: colors.textTertiary }]}>
                {isValidCoordinate(storeLat, storeLng)
                  ? 'Tap to change location'
                  : 'Open the map to place a pin for your store'}
              </Text>
            </View>
            <MaterialIcons name={ICONS.map} size={fontSize.lg} color={colors.primary} />
          </TouchableOpacity>
        </>
      )}

      {role === 'driver' && (
        <>
          <Text style={styles.label}>Vehicle Type</Text>
          <View style={styles.vehicleRow}>
            {['car', 'motorcycle', 'van', 'truck', 'bicycle'].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.vehicleCard, vehicleType === v && styles.vehicleCardActive]}
                onPress={() => setVehicleType(v)}
              >
                <Text style={[styles.vehicleText, vehicleType === v && styles.vehicleTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Vehicle Plate *</Text>
          <TextInput style={styles.input} value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="ABC 123" autoCapitalize="characters" />
        </>
      )}

      {role === 'customer' && (
        <>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="John Doe" />
          <Text style={styles.label}>Phone *</Text>
          <TextInput style={styles.input} value={customerPhone} onChangeText={setCustomerPhone} placeholder="+1234567890" keyboardType="phone-pad" />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSetup} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Complete Setup</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function LocationPickerSetup({
  initialLat, initialLng, onConfirm, onCancel,
}: {
  initialLat: number | null;
  initialLng: number | null;
  onConfirm: (lat: number, lng: number, addressText: string) => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  const [lat, setLat] = useState(initialLat ?? 15.3694);
  const [lng, setLng] = useState(initialLng ?? 44.1910);
  const [confirmed, setConfirmed] = useState(initialLat != null && initialLng != null);
  const [addr, setAddr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialLat == null || initialLng == null) {
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
    }
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

  const localStyles = StyleSheet.create({
    currentLocBtn: { position: 'absolute', bottom: 180, right: spacing.md, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    pickerBottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md, borderTopWidth: 1 },
    pickerCoordText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'center', marginBottom: spacing.sm },
    pickerButtonRow: { flexDirection: 'row', gap: spacing.sm },
    pickerCancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center' },
    pickerCancelText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    pickerConfirmBtn: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.md },
    pickerConfirmText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
  });

  return (
    <View style={{ flex: 1 }}>
      <SharedMap
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
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
        style={[localStyles.currentLocBtn, { backgroundColor: '#fff', borderColor: '#ccc' }, shadow.md]}
        onPress={handleUseCurrentLocation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#22C55E" />
        ) : (
          <MaterialIcons name={ICONS.location} size={24} color="#22C55E" />
        )}
      </TouchableOpacity>

      <View style={[localStyles.pickerBottomSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Text style={[localStyles.pickerCoordText, { color: colors.text }]}>
          {confirmed
            ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            : 'Long press on the map to set a pin'}
        </Text>
        <View style={localStyles.pickerButtonRow}>
          <TouchableOpacity
            style={[localStyles.pickerCancelBtn, { borderColor: colors.border }]}
            onPress={onCancel}
          >
            <Text style={[localStyles.pickerCancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[localStyles.pickerConfirmBtn, { backgroundColor: colors.primary }, (!confirmed) && { opacity: 0.5 }]}
            onPress={() => confirmed && onConfirm(lat, lng, addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)}
            disabled={!confirmed}
          >
            <MaterialIcons name={ICONS.check} size={fontSize.md} color="#fff" />
            <Text style={localStyles.pickerConfirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function useStyles() {
  const colors = useColors();
  return useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center', marginTop: spacing.xl },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.md, backgroundColor: colors.surface },
  vehicleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  vehicleCard: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  vehicleCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  vehicleText: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'capitalize' },
  vehicleTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
   error: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.sm },
   button: { backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.xl },
   buttonDisabled: { opacity: 0.6 },
   buttonText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
   pickOnMap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.sm },
   pickOnMapTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
   pickOnMapHint: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs },
   currentLocBtn: { position: 'absolute', bottom: 180, right: spacing.md, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
   pickerBottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md, borderTopWidth: 1, backgroundColor: colors.surface },
   pickerCoordText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'center', marginBottom: spacing.sm },
   pickerButtonRow: { flexDirection: 'row', gap: spacing.sm },
   pickerCancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center' },
   pickerCancelText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
   pickerConfirmBtn: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.md },
   pickerConfirmText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
 }), [colors]);
}
