import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../../src/theme/spacing';
import { ICONS } from '../../../../src/constants/icons';
import { supabase } from '../../../../src/lib/supabase';
import { useCreateOrderStore } from '../../../../src/store/create-order-store';
import AddressList from '../../../../src/components/AddressList';
import type { CustomerAddresses } from '../../../../src/types/database';

export default function SelectAddressScreen() {
  const colors = useColors();
  const store = useCreateOrderStore();
  const [addresses, setAddresses] = useState<CustomerAddresses[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!store.customerId) {
        if (router.canGoBack()) router.back(); else router.replace('/(app)/(store)');
        return;
      }
      supabase
        .rpc('get_customer_addresses', { p_customer_id: store.customerId })
        .then(({ data }) => {
          const rows = (Array.isArray(data) ? data : []) as CustomerAddresses[];
          setAddresses(rows);
          setLoading(false);

          if (store.newlyAddedAddressId) {
            const match = rows.find((a) => a.id === store.newlyAddedAddressId);
            if (match) {
              store.setSelectedAddress(match);
              store.setDelivery({
                address: match.address_text,
                lat: Number(match.latitude),
                lng: Number(match.longitude),
                apartment: match.apartment || undefined,
                floor: match.floor || undefined,
                landmark: match.landmark || undefined,
              });
              store.setNewlyAddedAddressId(null);
              router.push('/(app)/(store)/create-order/order-details');
            }
          }
        });
    }, [store.customerId]),
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleConfirm = () => {
    if (!selectedId) return;
    const address = addresses.find((a) => a.id === selectedId);
    if (!address) return;
    store.setSelectedAddress(address);
    store.setDelivery({
      address: address.address_text,
      lat: Number(address.latitude),
      lng: Number(address.longitude),
      apartment: address.apartment || undefined,
      floor: address.floor || undefined,
      landmark: address.landmark || undefined,
    });
    router.push('/(app)/(store)/create-order/order-details');
  };

  const handleAddNew = () => {
    router.push('/(app)/(store)/create-order/add-address');
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
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Select Delivery Address</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {store.customerName}'s saved addresses
        </Text>

        <AddressList
          addresses={addresses.map((a) => ({
            id: a.id,
            label: a.label,
            address_text: a.address_text,
            landmark: a.landmark,
            apartment: a.apartment,
            floor: a.floor,
            notes: a.notes,
            is_default: a.is_default,
          }))}
          selectedId={selectedId || undefined}
          onSelect={handleSelect}
          onAddNew={handleAddNew}
        />

        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {addresses.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
              Add a delivery address to continue
            </Text>
          ) : selectedId ? (
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirm}
            >
              <MaterialIcons name={ICONS.check} size={fontSize.md} color="#fff" />
              <Text style={styles.confirmBtnText}>Continue</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
              Select an address to continue
            </Text>
          )}
        </View>
      </View>
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
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
  },
  bottomBar: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  confirmBtn: {
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
