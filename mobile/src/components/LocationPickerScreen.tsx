import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { Marker } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useColors } from '../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight, shadow } from '../theme/spacing';
import { ICONS } from '../constants/icons';
import { isValidCoordinate } from '../lib/geo';
import SharedMap, { SharedMapRef } from './ui/SharedMap';

export interface LocationPickerResult {
  latitude: number;
  longitude: number;
  addressText: string;
  landmark: string;
  notes: string;
}

interface LocationPickerScreenProps {
  onConfirm: (result: LocationPickerResult) => void;
  onCancel?: () => void;
  initialLat?: number;
  initialLng?: number;
  title?: string;
}

export default function LocationPickerScreen({
  onConfirm, onCancel, initialLat, initialLng, title,
}: LocationPickerScreenProps) {
  const colors = useColors();
  const mapRef = useRef<SharedMapRef>(null);

  const [latitude, setLatitude] = useState(initialLat || 15.3694);
  const [longitude, setLongitude] = useState(initialLng || 44.1910);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [addressText, setAddressText] = useState('');
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const region = useMemo(() => ({
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }), [latitude, longitude]);

  useEffect(() => {
    if (initialLat && initialLng) {
      setLocationConfirmed(true);
      return;
    }
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLatitude(loc.coords.latitude);
          setLongitude(loc.coords.longitude);
          setLocationConfirmed(true);
          reverseGeocode(loc.coords.latitude, loc.coords.longitude);
        } catch {
          // GPS failed; user must interact
        }
      }
    })();
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const result = await Promise.race([
        Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      if (result && result[0]) {
        const parts = [result[0].street, result[0].city, result[0].region].filter(Boolean);
        setAddressText(parts.join(', '));
      } else {
        setAddressText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch {
      setAddressText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setGeocoding(false);
    }
  }, []);

  const handleLongPress = useCallback((event: any) => {
    const { latitude: lat, longitude: lng } = event.nativeEvent.coordinate;
    setLatitude(lat);
    setLongitude(lng);
    setLocationConfirmed(true);
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const handleUseCurrentLocation = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;
      setLatitude(lat);
      setLongitude(lng);
      setLocationConfirmed(true);
      mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
      await reverseGeocode(lat, lng);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [reverseGeocode]);

  const handleConfirm = () => {
    onConfirm({ latitude, longitude, addressText, landmark: landmark.trim(), notes: notes.trim() });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.backBtn}>
            <MaterialIcons name={ICONS.back} size={fontSize.lg} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title || 'Select Delivery Location'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1 }}>
        <SharedMap
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onLongPress={handleLongPress}
          loadingEnabled
        >
          {isValidCoordinate(latitude, longitude) && (
          <Marker
            coordinate={{ latitude, longitude }}
            title="Selected Location"
            draggable
            onDragEnd={(e) => {
              const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
              setLatitude(lat);
              setLongitude(lng);
              reverseGeocode(lat, lng);
            }}
          />
          )}
        </SharedMap>

        <TouchableOpacity
          style={[styles.currentLocBtn, { backgroundColor: colors.surface, borderColor: colors.border, ...shadow.md }]}
          onPress={handleUseCurrentLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons name={ICONS.location} size={fontSize.md} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {geocoding ? (
          <View style={styles.geocodingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.geocodingText, { color: colors.textSecondary }]}>Getting address...</Text>
          </View>
        ) : (
          <Text style={[styles.addressText, { color: colors.text }]}>
            {locationConfirmed ? addressText : 'Long press on the map to select a location'}
          </Text>
        )}

        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          value={landmark}
          onChangeText={setLandmark}
          placeholder="Nearest Landmark (e.g., near mosque)"
          placeholderTextColor={colors.textTertiary}
        />

        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional Notes (e.g., blue building, 2nd floor)"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={2}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary }, (!locationConfirmed) && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={!locationConfirmed}
          >
            <MaterialIcons name={ICONS.check} size={fontSize.md} color="#fff" />
            <Text style={styles.confirmBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  currentLocBtn: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  bottomSheet: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  geocodingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  geocodingText: {
    fontSize: fontSize.sm,
  },
  addressText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
