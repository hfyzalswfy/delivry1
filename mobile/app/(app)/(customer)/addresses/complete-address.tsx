import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useColors } from '../../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight, shadow } from '../../../../src/theme/spacing';
import { ICONS } from '../../../../src/constants/icons';
import { supabase } from '../../../../src/lib/supabase';
import { useAuthStore } from '../../../../src/store/auth-store';
import SharedMap from '../../../../src/components/ui/SharedMap';
import { isValidCoordinate } from '../../../../src/lib/geo';

export default function CompleteAddressScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number>(15.3694);
  const [longitude, setLongitude] = useState<number>(44.1910);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [landmark, setLandmark] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const gpsDone = useRef(false);

  useEffect(() => {
    const init = async () => {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile?.id)
        .maybeSingle();
      if (customer) setCustomerId(customer.id);
      setLoading(false);

      if (!gpsDone.current) {
        gpsDone.current = true;
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setLatitude(loc.coords.latitude);
            setLongitude(loc.coords.longitude);
            setLocationConfirmed(true);
          } catch {
            // GPS failed; user must interact with map
          }
        }
      }
    };
    init();
  }, [profile?.id]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const results = await Location.geocodeAsync(q);
      if (results && results.length > 0) {
        setLatitude(results[0].latitude);
        setLongitude(results[0].longitude);
        setLocationConfirmed(true);
      } else {
        setError('Location not found. Try long-pressing on the map.');
      }
    } catch {
      setError('Search failed. Try long-pressing on the map.');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      setLocationConfirmed(true);
    } catch {
      setError('Could not get current location. Long-press on the map instead.');
    }
  }, []);

  const handleSave = async () => {
    if (!customerId) {
      setError('Customer profile not found');
      return;
    }
    if (!landmark.trim() && !building.trim()) {
      setError('Please enter at least a landmark or building name');
      return;
    }
    if (!locationConfirmed || !isValidCoordinate(latitude, longitude)) {
      setError('Please set your location on the map first (long-press, search, or use GPS)');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('customer_addresses').insert({
        customer_id: customerId,
        label: 'Home',
        address_text: [building.trim(), landmark.trim(), 'Sana\'a'].filter(Boolean).join(', '),
        latitude,
        longitude,
        landmark: landmark.trim(),
        apartment: building.trim(),
        floor: floor.trim() || null,
        notes: notes.trim() || null,
        is_default: true,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      Alert.alert(
        'Address Saved',
        'Your address has been saved. You can manage your addresses from your profile.',
        [{ text: 'Continue', onPress: () => router.replace('/(app)/(customer)') }],
      );
    } catch {
      setError('Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip for now?',
      'You can always add an address later from your profile settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: () => router.replace('/(app)/(customer)') },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ActivityIndicator size="large" style={{ flex: 1 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Complete Your Address</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1 }}>
        <SharedMap
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onLongPress={(e) => {
            setLatitude(e.nativeEvent.coordinate.latitude);
            setLongitude(e.nativeEvent.coordinate.longitude);
            setLocationConfirmed(true);
          }}
          loadingEnabled
        >
          <Marker
            coordinate={{ latitude, longitude }}
            draggable
            onDragEnd={(e) => {
              setLatitude(e.nativeEvent.coordinate.latitude);
              setLongitude(e.nativeEvent.coordinate.longitude);
              setLocationConfirmed(true);
            }}
          />
        </SharedMap>

        {/* Search bar overlay */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, ...shadow.sm }]}>
          <MaterialIcons name={ICONS.search} size={fontSize.md} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for a place..."
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity onPress={handleSearch}>
              <MaterialIcons name={ICONS.search} size={fontSize.md} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.currentLocBtn, { backgroundColor: colors.surface, borderColor: colors.border, ...shadow.md }]}
          onPress={handleUseCurrentLocation}
        >
          <MaterialIcons name={ICONS.location} size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={[styles.bottomSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.inputRow}>
            <MaterialIcons name={ICONS.location} size={fontSize.sm} color={locationConfirmed ? colors.primary : colors.textTertiary} />
            <Text style={[styles.coordText, { color: colors.text }]}>
              {locationConfirmed ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : 'Set location on map'}
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <MaterialIcons name={ICONS.location} size={fontSize.sm} color={colors.textTertiary} />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, flex: 1, marginLeft: spacing.sm }]}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="Nearest Landmark *"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.fieldRow}>
            <MaterialIcons name={ICONS.store} size={fontSize.sm} color={colors.textTertiary} />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, flex: 1, marginLeft: spacing.sm }]}
              value={building}
              onChangeText={setBuilding}
              placeholder="Building Name / Number"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.fieldRow}>
            <MaterialIcons name={ICONS.menu} size={fontSize.sm} color={colors.textTertiary} />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, flex: 1, marginLeft: spacing.sm }]}
              value={floor}
              onChangeText={setFloor}
              placeholder="Floor"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.fieldRow}>
            <MaterialIcons name={ICONS.edit} size={fontSize.sm} color={colors.textTertiary} />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, flex: 1, marginLeft: spacing.sm }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional Notes (e.g., gate code, directions)"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, (!locationConfirmed || saving) && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={!locationConfirmed || saving}
          >
            <MaterialIcons name={ICONS.check} size={fontSize.md} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Address'}</Text>
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
  skipText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  searchBar: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    zIndex: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    paddingVertical: spacing.xs,
  },
  currentLocBtn: {
    position: 'absolute',
    bottom: 300,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  bottomSheet: {
    borderTopWidth: 1,
    padding: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  coordText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
  },
  error: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
