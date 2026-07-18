import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { Drivers } from '../../../src/types/database';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/index';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../../src/constants/icons';

export default function DriverProfileScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<Drivers | null>(null);
  const [docStatus, setDocStatus] = useState<{ approved: number; total: number }>({ approved: 0, total: 0 });
  const cancelledRef = useRef(false);

  const S = useMemo(() => makeStyles(colors), [colors]);

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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: t('profile.title'), headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() ?? '?';
  const rating = driver?.average_rating ?? 0;
  const totalDeliveries = driver?.total_deliveries ?? 0;

  const menuItems: { icon: keyof typeof ICONS; labelKey: string; route: string }[] = [
    { icon: 'document', labelKey: 'profile.documents', route: '/(app)/(driver)/documents' },
    { icon: 'lock', labelKey: 'accountStatus.title', route: '/(app)/(driver)/account-status' },
    { icon: 'stars', labelKey: 'rewards.title', route: '/(app)/(driver)/rewards' },
    { icon: 'notifications', labelKey: 'notifications.title', route: '/(app)/(notifications)' },
    { icon: 'settings', labelKey: 'settings.title', route: '/(app)/(driver)/settings' },
    { icon: 'language', labelKey: 'settings.language', route: '/(app)/(driver)/language' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('profile.title'), headerTitleStyle: { fontWeight: '600', color: colors.text } }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
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
            <Text style={[S.statValue, { color: driver?.is_verified ? colors.primary : colors.danger }]}>
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
            const icons: Record<string, keyof typeof ICONS> = {
              license: 'flag', vehicle_registration: 'car', national_id: 'person',
            };
            return (
              <View key={type} style={S.docRow}>
                <MaterialIcons name={ICONS[icons[type]]} size={fontSize.lg} color={colors.text} />
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
                <MaterialIcons name={ICONS[item.icon]} size={fontSize.xl} color={colors.text} />
                <Text style={S.menuLabel}>{t(item.labelKey)}</Text>
              </View>
              <MaterialIcons name={ICONS.chevronRight} size={fontSize.xxl} color={colors.textSecondary} />
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

const makeStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  profileHeader: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.lg, paddingHorizontal: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: borderRadius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, color: colors.text },
  name: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
  role: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary, marginBottom: spacing.xs },
  phone: { fontSize: fontSize.md, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 2 },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, marginHorizontal: spacing.md, marginBottom: spacing.sm + spacing.xs, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm + spacing.xs },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: fontSize.md, color: colors.textSecondary },
  infoValue: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  docRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm + spacing.xs },
  docLabel: { fontSize: fontSize.md, color: colors.text, marginLeft: spacing.sm + spacing.xs },
  manageDocsBtn: { marginTop: spacing.sm, paddingVertical: spacing.sm + spacing.xs, alignItems: 'center', backgroundColor: colors.borderLight, borderRadius: borderRadius.md },
  manageDocsText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary },
  menuSection: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginLeft: spacing.sm + spacing.xs },
  memberSince: { fontSize: fontSize.sm, color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.md },
  signOutBtn: { marginHorizontal: spacing.md, paddingVertical: spacing.sm + spacing.xs + spacing.xs, alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.dangerLight },
  signOutText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.danger },
});
