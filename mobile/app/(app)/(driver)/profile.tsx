import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { Drivers } from '../../../src/types/database';
import { useTheme } from '../../../src/theme/ThemeProvider';
import type { Theme } from '../../../src/theme/driver-theme';

export default function DriverProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<Drivers | null>(null);
  const [docStatus, setDocStatus] = useState<{ approved: number; total: number }>({ approved: 0, total: 0 });
  const cancelledRef = useRef(false);

  const S = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    if (!profile) return;
    cancelledRef.current = false;
    (async () => {
      const { data: d } = await supabase.from('drivers').select('*').eq('profile_id', profile.id).single();
      if (!d || cancelledRef.current) { setLoading(false); return; }
      setDriver(d);
      const { data: docs } = await supabase.from('driver_documents').select('document_type, status').eq('driver_id', d.id).is('deleted_at', null);
      if (cancelledRef.current) return;
      const uniqueTypes = new Set(docs?.map((doc) => doc.document_type) ?? []);
      const approvedTypes = new Set(docs?.filter((doc) => doc.status === 'approved').map((doc) => doc.document_type) ?? []);
      setDocStatus({ approved: approvedTypes.size, total: uniqueTypes.size });
      if (!cancelledRef.current) setLoading(false);
    })();
    return () => { cancelledRef.current = true; };
  }, [profile]);

  const handleSignOut = () => {
    Alert.alert(t('auth.signOutConfirmTitle'), t('auth.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <Stack.Screen options={{ title: t('profile.title'), headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      </SafeAreaView>
    );
  }

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() ?? '?';
  const rating = driver?.average_rating ?? 0;
  const totalDeliveries = driver?.total_deliveries ?? 0;

  const menuItems: { icon: string; labelKey: string; route: string }[] = [
    { icon: '\u{1F4C4}', labelKey: 'profile.documents', route: '/(app)/(driver)/documents' },
    { icon: '\u{1F512}', labelKey: 'accountStatus.title', route: '/(app)/(driver)/account-status' },
    { icon: '\u{1F3C6}', labelKey: 'rewards.title', route: '/(app)/(driver)/rewards' },
    { icon: '\u{1F4CB}', labelKey: 'notifications.title', route: '/(app)/(notifications)' /* outside driver tab */ },
    { icon: '\u{2699}\u{FE0F}', labelKey: 'settings.title', route: '/(app)/(driver)/settings' },
    { icon: '\u{1F4F1}', labelKey: 'settings.language', route: '/(app)/(driver)/language' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: t('profile.title'), headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={S.profileHeader}>
          <View style={S.avatar}>
            <Text style={S.avatarText}>{initial}</Text>
          </View>
          <Text style={S.name}>{profile?.full_name ?? t('profile.driver')}</Text>
          <Text style={S.role}>{t('profile.driver')}</Text>
          {profile?.phone && <Text style={S.phone}>{profile.phone}</Text>}
        </View>

        <View style={S.statsRow}>
          <View style={S.statCard}>
            <Text style={S.statValue}>{totalDeliveries}</Text>
            <Text style={S.statLabel}>{t('profile.deliveries')}</Text>
          </View>
          <View style={S.statCard}>
            <Text style={S.statValue}>{rating.toFixed(1)}</Text>
            <Text style={S.statLabel}>{t('home.rating')}</Text>
          </View>
          <View style={S.statCard}>
            <Text style={[S.statValue, { color: driver?.is_verified ? theme.green : theme.red }]}>
              {driver?.is_verified ? t('profile.yes') : t('profile.no')}
            </Text>
            <Text style={S.statLabel}>{t('profile.verified')}</Text>
          </View>
          <View style={S.statCard}>
            <Text style={S.statValue}>{docStatus.approved}/{docStatus.total}</Text>
            <Text style={S.statLabel}>{t('profile.docStatus')}</Text>
          </View>
        </View>

        <View style={S.card}>
          <Text style={S.cardTitle}>{t('profile.vehicleInfo')}</Text>
          <View style={S.infoRow}>
            <Text style={S.infoLabel}>{t('profile.vehicleType')}</Text>
            <Text style={S.infoValue}>{driver?.vehicle_type || t('profile.notSet')}</Text>
          </View>
          <View style={S.infoRow}>
            <Text style={S.infoLabel}>{t('profile.vehiclePlate')}</Text>
            <Text style={S.infoValue}>{driver?.vehicle_plate || t('profile.notSet')}</Text>
          </View>
          <View style={[S.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={S.infoLabel}>{t('profile.vehicleColor')}</Text>
            <Text style={S.infoValue}>{driver?.vehicle_color || t('profile.notSet')}</Text>
          </View>
        </View>

        <View style={S.card}>
          <Text style={S.cardTitle}>{t('profile.bankAccount')}</Text>
          <View style={S.infoRow}>
            <Text style={S.infoLabel}>{t('profile.bankName')}</Text>
            <Text style={S.infoValue}>{driver?.bank_name || t('profile.notSet')}</Text>
          </View>
          <View style={S.infoRow}>
            <Text style={S.infoLabel}>{t('profile.accountName')}</Text>
            <Text style={S.infoValue}>{driver?.bank_account_name || t('profile.notSet')}</Text>
          </View>
          <View style={[S.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={S.infoLabel}>{t('profile.accountNumber')}</Text>
            <Text style={S.infoValue}>{driver?.bank_account_number || t('profile.notSet')}</Text>
          </View>
        </View>

        <View style={S.card}>
          <Text style={S.cardTitle}>{t('profile.documents')}</Text>
          {['license', 'vehicle_registration', 'national_id'].map((type) => {
            const labels: Record<string, string> = {
              license: t('documents.driverLicense'), vehicle_registration: t('documents.vehicleRegistration'), national_id: t('documents.nationalId'),
            };
            const icons: Record<string, string> = {
              license: '\u{1F3C1}', vehicle_registration: '\u{1F697}', national_id: '\u{1F464}',
            };
            return (
              <View key={type} style={S.docRow}>
                <Text style={{ fontSize: 18 }}>{icons[type]}</Text>
                <Text style={S.docLabel}>{labels[type]}</Text>
              </View>
            );
          })}
          <TouchableOpacity style={S.manageDocsBtn} onPress={() => router.push('/(app)/(driver)/documents')}>
            <Text style={S.manageDocsText}>{t('profile.manageDocuments')}</Text>
          </TouchableOpacity>
        </View>

        <View style={S.menuSection}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity key={idx} style={S.menuItem} onPress={() => router.push(item.route as any)}>
              <View style={S.menuLeft}>
                <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                <Text style={S.menuLabel}>{t(item.labelKey)}</Text>
              </View>
              <Text style={S.menuArrow}>{'\u{203A}'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={S.memberSince}>
          {t('profile.memberSince', { date: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—' })}
        </Text>

        <TouchableOpacity style={S.signOutBtn} onPress={handleSignOut}>
          <Text style={S.signOutText}>{t('auth.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  profileHeader: { alignItems: 'center', paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.lg, paddingHorizontal: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.green, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.md },
  avatarText: { fontSize: theme.fontSize.xxxl, fontWeight: theme.fontWeight.bold, color: theme.white },
  name: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.white, marginBottom: 4 },
  role: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.green, marginBottom: 4 },
  phone: { fontSize: theme.fontSize.md, color: theme.gray },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: theme.card, borderRadius: theme.radius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  statValue: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.white, marginBottom: 2 },
  statLabel: { fontSize: theme.fontSize.xs, color: theme.gray },
  card: { backgroundColor: theme.card, borderRadius: theme.radius.lg, marginHorizontal: 16, marginBottom: 12, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.border },
  cardTitle: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.white, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  infoLabel: { fontSize: theme.fontSize.md, color: theme.gray },
  infoValue: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.white },
  docRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  docLabel: { fontSize: theme.fontSize.md, color: theme.nearWhite, marginLeft: 10 },
  manageDocsBtn: { marginTop: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: theme.badgeGray, borderRadius: theme.radius.md },
  manageDocsText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.green },
  menuSection: { marginHorizontal: 16, marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.card, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, marginBottom: 8 },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuLabel: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.white, marginLeft: 12 },
  menuArrow: { fontSize: theme.fontSize.xxl, color: theme.gray },
  memberSince: { fontSize: theme.fontSize.sm, color: theme.dim, textAlign: 'center', marginBottom: 16 },
  signOutBtn: { marginHorizontal: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.redDark },
  signOutText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.red },
});
