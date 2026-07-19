import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { router, Stack } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { Stores } from '../../../src/types/database';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../../src/constants/icons';
import { ProfileHeader, ProfileStatsRow, ProfileCard, ProfileInfoRow, ProfileMenuSection, ProfileSignOut } from '../../../src/components/profile';

export default function StoreProfileScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [store, setStore] = useState<Stores | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.from('stores').select('*').eq('owner_id', profile.id).single();
      if (data) setStore(data);
      setLoading(false);
    })();
  }, [profile]);

  const menuItems = [
    { icon: 'store' as keyof typeof ICONS, label: 'Store Address', route: '/(app)/(store)/store-address' },
    { icon: 'settings' as keyof typeof ICONS, label: 'Settings', onPress: () => router.push('/(app)/(store)/settings' as any) },
    { icon: 'notifications' as keyof typeof ICONS, label: 'Notifications', route: '/(app)/(notifications)' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Profile', headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />
        <ActivityIndicator size="large" style={{ flex: 1 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Profile', headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        <ProfileHeader
          name={store?.name || profile?.full_name || 'Store'}
          role="Store Owner"
          phone={store?.phone || profile?.phone}
        />

        <ProfileStatsRow
          stats={[
            { value: store?.is_active ? 'Open' : 'Closed', label: 'Status', valueColor: store?.is_active ? colors.statusDelivered : colors.statusCancelled },
            { value: store?.address ? 'Set' : 'Not Set', label: 'Address' },
          ]}
        />

        {store && (
          <ProfileCard title="Store Information">
            <ProfileInfoRow label="Name" value={store.name} />
            <ProfileInfoRow label="Phone" value={store.phone || 'Not set'} />
            <ProfileInfoRow label="Email" value={store.email || 'Not set'} />
            <ProfileInfoRow label="Commercial Reg." value={store.commercial_registration || 'Not set'} isLast />
          </ProfileCard>
        )}

        <ProfileCard title="Account">
          <ProfileInfoRow label="Name" value={profile?.full_name || '—'} />
          <ProfileInfoRow label="Phone" value={profile?.phone || '—'} />
          <ProfileInfoRow label="Role" value={(profile?.role || '').toUpperCase()} isLast />
        </ProfileCard>

        <ProfileMenuSection items={menuItems} />

        <ProfileSignOut />
      </ScrollView>
    </SafeAreaView>
  );
}
