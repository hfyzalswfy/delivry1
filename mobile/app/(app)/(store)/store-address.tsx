import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight, shadow } from '../../../src/theme/spacing';
import { ICONS } from '../../../src/constants/icons';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { isValidCoordinate } from '../../../src/lib/geo';
import SharedMap from '../../../src/components/ui/SharedMap';

export default function StoreAddressScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [addressText, setAddressText] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [landmark, setLandmark] = useState('');
  const [building, setBuilding] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('stores')
        .select('address, latitude, longitude, landmark, building, notes')
        .eq('owner_id', profile?.id)
        .single();
      if (data) {
        setAddressText(data.address || '');
        if (data.latitude != null) setLatitude(Number(data.latitude));
        if (data.longitude != null) setLongitude(Number(data.longitude));
        setLandmark(data.landmark || '');
        setBuilding(data.building || '');
        setNotes(data.notes || '');
      }
      setLoading(false);
    })();
  }, [profile?.id]);

  const handleSave = async () => {
    if (latitude == null || longitude == null) {
      Alert.alert('Location Required', 'Please set your store location on the map before saving.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('stores')
      .update({
        address: addressText || null,
        latitude,
        longitude,
        landmark: landmark || null,
        building: building || null,
        notes: notes || null,
      })
      .eq('owner_id', profile?.id);

    if (error) {
      Alert.alert('Error', error.message);
      setSaving(false);
      return;
    }
    await refreshProfile();
    setSaving(false);
    if (router.canGoBack()) router.back(); else router.replace('/(app)/(store)');
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (showPicker) {
    return <LocationPickerInline
      initialLat={latitude}
      initialLng={longitude}
      onConfirm={(lat, lng, addr) => {
        setLatitude(lat);
        setLongitude(lng);
        setAddressText(addr);
        setLocationConfirmed(true);
        setShowPicker(false);
      }}
      onCancel={() => setShowPicker(false)}
    />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>Store Address</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Set your store's primary pickup location. This will be used as the default pickup address for all orders.
        </Text>

        <TouchableOpacity
          style={[styles.mapPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowPicker(true)}
        >
          <MaterialIcons name={ICONS.location} size={fontSize.xl} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[styles.mapPreviewTitle, { color: colors.text }]}>
              {isValidCoordinate(latitude, longitude)
                ? `${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}`
                : 'Set Store Location on Map'}
            </Text>
            <Text style={[styles.mapPreviewHint, { color: colors.textTertiary }]}>
              {isValidCoordinate(latitude, longitude)
                ? 'Tap to change location'
                : 'Open the map to place a pin for your store'}
            </Text>
          </View>
          <MaterialIcons name={ICONS.map} size={fontSize.lg} color={colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.text }]}>Address Text</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={addressText}
          onChangeText={setAddressText}
          placeholder="Street, city, area"
          placeholderTextColor={colors.textTertiary}
        />

        <Text style={[styles.label, { color: colors.text }]}>Nearest Landmark</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={landmark}
          onChangeText={setLandmark}
          placeholder="Near Al Rawda Mosque, next to Al Jazeera Pharmacy"
          placeholderTextColor={colors.textTertiary}
        />

        <Text style={[styles.label, { color: colors.text }]}>Building</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={building}
          onChangeText={setBuilding}
          placeholder="Building name or number"
          placeholderTextColor={colors.textTertiary}
        />

        <Text style={[styles.label, { color: colors.text }]}>Additional Notes for Pickup</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Blue building, second entrance"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name={ICONS.check} size={fontSize.md} color="#fff" />
              <Text style={styles.saveBtnText}>Save Address</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

interface LocationPickerInlineProps {
  initialLat: number | null;
  initialLng: number | null;
  onConfirm: (lat: number, lng: number, addressText: string) => void;
  onCancel: () => void;
}

function LocationPickerInline({ initialLat, initialLng, onConfirm, onCancel }: LocationPickerInlineProps) {
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
        style={[styles.currentLocBtn, { backgroundColor: '#fff', borderColor: '#ccc', ...shadow.md }]}
        onPress={handleUseCurrentLocation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#22C55E" />
        ) : (
          <MaterialIcons name={ICONS.location} size={24} color="#22C55E" />
        )}
      </TouchableOpacity>

      <View style={[styles.pickerBottomSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Text style={[styles.pickerCoordText, { color: colors.text }]}>
          {confirmed
            ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            : 'Long press on the map to set a pin'}
        </Text>
        <View style={styles.pickerButtonRow}>
          <TouchableOpacity
            style={[styles.pickerCancelBtn, { borderColor: colors.border }]}
            onPress={onCancel}
          >
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
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
  },
  mapPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  mapPreviewTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  mapPreviewHint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
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
