import { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useAuthStore } from '../../src/store/auth-store';
import { supabase } from '../../src/lib/supabase';
import { useColors } from '../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../src/theme/spacing';

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
          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} value={storeAddress} onChangeText={setStoreAddress} placeholder="123 Main St" />
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
}), [colors]);
}
