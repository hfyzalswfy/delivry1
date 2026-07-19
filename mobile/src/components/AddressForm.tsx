import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useColors } from '../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight, shadow } from '../theme/spacing';
import { ICONS } from '../constants/icons';
import { isValidCoordinate } from '../lib/geo';
import SharedMap from './ui/SharedMap';

export interface AddressFormValues {
  label: string;
  address_text: string;
  latitude: number;
  longitude: number;
  landmark: string;
  apartment: string;
  floor: string;
  notes: string;
}

interface AddressFormProps {
  initialValues?: Partial<AddressFormValues>;
  onSubmit: (values: AddressFormValues) => Promise<void>;
  onCancel?: () => void;
  onPickOnMap?: () => void;
  submitLabel?: string;
  loading?: boolean;
  error?: string;
}

const LABEL_OPTIONS = ['Home', 'Work', 'Office', 'Shop', 'Other'];

export default function AddressForm({
  initialValues, onSubmit, onCancel, onPickOnMap,
  submitLabel = 'Save Address', loading, error,
}: AddressFormProps) {
  const colors = useColors();
  const [label, setLabel] = useState(initialValues?.label || '');
  const [addressText, setAddressText] = useState(initialValues?.address_text || '');
  const [latitude, setLatitude] = useState(initialValues?.latitude);
  const [longitude, setLongitude] = useState(initialValues?.longitude);
  const [landmark, setLandmark] = useState(initialValues?.landmark || '');
  const [apartment, setApartment] = useState(initialValues?.apartment || '');
  const [floor, setFloor] = useState(initialValues?.floor || '');
  const [notes, setNotes] = useState(initialValues?.notes || '');
  const [formError, setFormError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const handlePickOnMap = () => {
    if (onPickOnMap) {
      onPickOnMap();
      return;
    }
    setShowPicker(true);
  };

  const handlePickerConfirm = (lat: number, lng: number, addr: string) => {
    setLatitude(lat);
    setLongitude(lng);
    setAddressText(addr);
    setShowPicker(false);
  };

  const handlePickerCancel = () => {
    setShowPicker(false);
  };

  const handleUseCurrentLocation = useCallback(async () => {
    setPickerLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;
      setLatitude(lat);
      setLongitude(lng);
      setLocationConfirmed(true);
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
      // silently fail
    } finally {
      setPickerLoading(false);
    }
  }, []);

  if (showPicker) {
    return (
      <View style={{ flex: 1 }}>
        <SharedMap
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: latitude ?? 15.3694,
            longitude: longitude ?? 44.1910,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onLongPress={(e) => {
            const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
            setLatitude(lat);
            setLongitude(lng);
            setLocationConfirmed(true);
          }}
          loadingEnabled
        >
          {isValidCoordinate(latitude, longitude) && (
            <Marker
              coordinate={{ latitude: latitude!, longitude: longitude! }}
              draggable
              onDragEnd={(e) => {
                const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                setLatitude(lat);
                setLongitude(lng);
                setLocationConfirmed(true);
              }}
            />
          )}
        </SharedMap>

        <TouchableOpacity
          style={[styles.currentLocBtn, { backgroundColor: '#fff', borderColor: '#ccc', ...shadow.md }]}
          onPress={handleUseCurrentLocation}
          disabled={pickerLoading}
        >
          {pickerLoading ? (
            <ActivityIndicator size="small" color="#22C55E" />
          ) : (
            <MaterialIcons name={ICONS.location} size={24} color="#22C55E" />
          )}
        </TouchableOpacity>

        <View style={[styles.pickerBottomSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Text style={[styles.pickerCoordText, { color: colors.text }]}>
            {locationConfirmed
              ? `${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}`
              : 'Long press on the map to set a pin'}
          </Text>
          <View style={styles.pickerButtonRow}>
            <TouchableOpacity
              style={[styles.pickerCancelBtn, { borderColor: colors.border }]}
              onPress={handlePickerCancel}
            >
              <Text style={[styles.pickerCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickerConfirmBtn, { backgroundColor: colors.primary }, (!locationConfirmed) && { opacity: 0.5 }]}
              onPress={() => locationConfirmed && handlePickerConfirm(latitude!, longitude!, addressText || `${latitude!.toFixed(4)}, ${longitude!.toFixed(4)}`)}
              disabled={!locationConfirmed}
            >
              <MaterialIcons name={ICONS.check} size={fontSize.md} color="#fff" />
              <Text style={styles.pickerConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const handleSubmit = async () => {
    setFormError('');
    if (!addressText.trim() && !landmark.trim()) {
      setFormError('Address or landmark is required');
      return;
    }
    if (latitude == null || longitude == null) {
      setFormError('Please pick a location on the map');
      return;
    }
    await onSubmit({
      label: label || 'Other',
      address_text: addressText.trim() || landmark.trim(),
      latitude,
      longitude,
      landmark: landmark.trim(),
      apartment: apartment.trim(),
      floor: floor.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Address Label</Text>
      <View style={styles.labelRow}>
        {LABEL_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.labelChip,
              { borderColor: label === opt ? colors.primary : colors.border, backgroundColor: label === opt ? colors.primaryLight : colors.surface },
            ]}
            onPress={() => setLabel(opt)}
          >
            <Text style={[styles.labelChipText, { color: label === opt ? colors.primaryDark : colors.text }]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.pickOnMap, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handlePickOnMap}>
        <MaterialIcons name={ICONS.location} size={fontSize.md} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[styles.pickOnMapTitle, { color: colors.text }]}>
            {latitude != null && longitude != null
              ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              : 'Set Location on Map'}
          </Text>
          <Text style={[styles.pickOnMapHint, { color: colors.textTertiary }]}>
            {latitude != null ? 'Tap to change location' : 'Open the map to place a pin'}
          </Text>
        </View>
        <MaterialIcons name={ICONS.map} size={fontSize.lg} color={colors.primary} />
      </TouchableOpacity>

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
        value={apartment}
        onChangeText={setApartment}
        placeholder="Building name or number"
        placeholderTextColor={colors.textTertiary}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.text }]}>Floor</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={floor}
            onChangeText={setFloor}
            placeholder="Floor number"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.text }]}>Area / Street</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={addressText}
            onChangeText={setAddressText}
            placeholder="e.g. Hadda Street, Sana'a"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Additional Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Blue building, second entrance, ring the bell"
        placeholderTextColor={colors.textTertiary}
        multiline
        numberOfLines={3}
      />

      {(formError || error) ? (
        <Text style={[styles.error, { color: colors.danger }]}>{formError || error}</Text>
      ) : null}

      <View style={styles.buttonRow}>
        {onCancel && (
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onCancel}>
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Saving...' : submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  labelChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  labelChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
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
  pickOnMap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pickOnMapTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  pickOnMapHint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfField: {
    flex: 1,
  },
  error: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
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
  submitBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
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
