import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../../src/theme/spacing';
import { ICONS } from '../../../../src/constants/icons';
import { supabase } from '../../../../src/lib/supabase';
import { useAuthStore } from '../../../../src/store/auth-store';
import { useCreateOrderStore } from '../../../../src/store/create-order-store';

export default function CustomerLookupScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const store = useCreateOrderStore();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerFound, setCustomerFound] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  const handleSearch = async () => {
    const trimmed = phone.trim();
    if (!trimmed) { setError('Please enter a phone number'); return; }
    setError('');
    setLoading(true);
    setSearchDone(false);

    try {
      const { data: customer } = await supabase
        .rpc('get_customer_info', { p_phone: trimmed })
        .maybeSingle();

      if (customer) {
        const info = customer as { id: string; full_name: string };
        store.setCustomer({ id: info.id, name: info.full_name, phone: trimmed, isExisting: true });
        setCustomerFound(true);
        setName(info.full_name);
      } else {
        store.setCustomer({ id: null, name: '', phone: trimmed, isExisting: false });
        setCustomerFound(false);
        setName('');
      }
      setSearchDone(true);
    } catch {
      setError('Failed to look up customer');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = async () => {
    if (!customerFound && !name.trim()) {
      setError('Please enter the customer name');
      return;
    }
    if (!customerFound) {
      store.setCustomer({ id: null, name: name.trim(), phone: phone.trim(), isExisting: false });
    }

    // Load store address as default pickup
    setLoading(true);
    const { data: storeData } = await supabase
      .from('stores')
      .select('name, address, latitude, longitude, landmark, building, notes')
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
      setError('Please set your store address in Profile > Store Address before creating orders.');
      return;
    }

    if (customerFound) {
      router.push('/(app)/(store)/create-order/select-address');
    } else {
      router.push('/(app)/(store)/create-order/location-picker');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>Customer Lookup</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Enter the customer's phone number to check if they have saved addresses
        </Text>

        <Text style={[styles.label, { color: colors.text }]}>Phone Number *</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="+967 XXX XXX XXX"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name={ICONS.search} size={fontSize.md} color="#fff" />}
          </TouchableOpacity>
        </View>

        {searchDone && customerFound && (
          <View style={[styles.foundCard, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
            <MaterialIcons name={ICONS.checkCircle} size={fontSize.md} color={colors.success} />
            <Text style={[styles.foundText, { color: colors.success }]}>Customer found: {name}</Text>
          </View>
        )}

        {searchDone && !customerFound && (
          <View style={[styles.notFoundCard, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
            <MaterialIcons name={ICONS.warning} size={fontSize.md} color={colors.warning} />
            <Text style={[styles.notFoundText, { color: colors.warning }]}>Customer not found. Enter name to continue.</Text>
          </View>
        )}

        {searchDone && !customerFound && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Customer Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={colors.textTertiary}
            />
          </>
        )}

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.proceedBtn, { backgroundColor: colors.primary }, (!searchDone) && { opacity: 0.5 }]}
          onPress={handleProceed}
          disabled={!searchDone}
        >
          <Text style={styles.proceedBtnText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  foundText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  notFoundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  notFoundText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  error: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  proceedBtn: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  proceedBtnText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
