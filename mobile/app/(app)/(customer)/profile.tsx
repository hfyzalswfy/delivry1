import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth-store';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { ICONS } from '../../../src/constants/icons';
import { supabase } from '../../../src/lib/supabase';
import AddressCard from '../../../src/components/AddressCard';
import { ProfileHeader, ProfileCard, ProfileInfoRow, ProfileSignOut } from '../../../src/components/profile';
import type { CustomerAddresses } from '../../../src/types/database';

export default function CustomerProfileScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const [addresses, setAddresses] = useState<CustomerAddresses[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAddresses = async () => {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile?.id)
        .maybeSingle();
      if (customer) {
        const { data } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', customer.id)
          .order('is_default', { ascending: false });
        if (data) setAddresses(data as CustomerAddresses[]);
      }
      setLoading(false);
    };
    loadAddresses();
  }, [profile?.id]);

  const handleDelete = async (id: string) => {
    await supabase.from('customer_addresses').delete().eq('id', id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from('customer_addresses').update({ is_default: true }).eq('id', id);
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
  };

  const customerStats = addresses.length > 0
    ? [{ value: addresses.length, label: 'Saved Addresses' }]
    : [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <ProfileHeader
        name={profile?.full_name ?? 'User'}
        role={(profile?.role ?? '').toUpperCase()}
        phone={profile?.phone}
      />

      {customerStats.length > 0 && (
        <View style={styles.statsRow}>
          {customerStats.map((stat, idx) => (
            <View key={idx} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Saved Addresses</Text>
        <TouchableOpacity
          style={[styles.addAddressBtn, { backgroundColor: colors.primaryLight, borderRadius: borderRadius.md }]}
          onPress={() => router.push('/(app)/(customer)/addresses/new')}
        >
          <MaterialIcons name={ICONS.add} size={fontSize.sm} color={colors.primary} />
          <Text style={[styles.addAddressText, { color: colors.primary }]}>Add New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Loading addresses...</Text>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name={ICONS.location} size={fontSize.xxxl} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No saved addresses</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>Add an address for faster checkout</Text>
        </View>
      ) : (
        addresses.map((addr) => (
          <View key={addr.id} style={{ paddingHorizontal: spacing.md }}>
            <AddressCard
              id={addr.id}
              label={addr.label}
              addressText={addr.address_text}
              landmark={addr.landmark}
              apartment={addr.apartment}
              floor={addr.floor}
              notes={addr.notes}
              isDefault={addr.is_default}
              onPress={(id) => router.push(`/(app)/(customer)/addresses/${id}`)}
              onEdit={(id) => router.push(`/(app)/(customer)/addresses/${id}`)}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          </View>
        ))
      )}

      <ProfileCard title="Account">
        <ProfileInfoRow label="Name" value={profile?.full_name || '—'} />
        <ProfileInfoRow label="Phone" value={profile?.phone || '—'} />
        <ProfileInfoRow label="Role" value={(profile?.role || '').toUpperCase()} isLast />
      </ProfileCard>

      <ProfileSignOut />

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: { flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  statCard: { flex: 1, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: 2 },
  statLabel: { fontSize: fontSize.xs },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  addAddressBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: borderRadius.md },
  addAddressText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  loadingText: { textAlign: 'center', fontSize: fontSize.sm, padding: spacing.lg },
  emptyState: { alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginTop: spacing.sm },
  emptySubtitle: { fontSize: fontSize.sm, marginTop: spacing.xs },
});
