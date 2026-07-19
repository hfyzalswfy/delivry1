import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { Drivers } from '../../../src/types/database';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../../src/constants/icons';
import { ProfileHeader, ProfileStatsRow, ProfileCard, ProfileInfoRow, ProfileDocRow, ProfileMenuSection, ProfileSignOut } from '../../../src/components/profile';

export default function DriverProfileScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
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

  const rating = driver?.average_rating ?? 0;
  const totalDeliveries = driver?.total_deliveries ?? 0;

  const menuItems = [
    { icon: 'document' as keyof typeof ICONS, label: t('profile.documents'), route: '/(app)/(driver)/documents' },
    { icon: 'lock' as keyof typeof ICONS, label: t('accountStatus.title'), route: '/(app)/(driver)/account-status' },
    { icon: 'stars' as keyof typeof ICONS, label: t('rewards.title'), route: '/(app)/(driver)/rewards' },
    { icon: 'notifications' as keyof typeof ICONS, label: t('notifications.title'), route: '/(app)/(notifications)' },
    { icon: 'settings' as keyof typeof ICONS, label: t('settings.title'), route: '/(app)/(driver)/settings' },
    { icon: 'language' as keyof typeof ICONS, label: t('settings.language'), route: '/(app)/(driver)/language' },
  ];

  const docTypes = [
    { icon: 'flag' as keyof typeof ICONS, labelKey: 'documents.driverLicense' },
    { icon: 'car' as keyof typeof ICONS, labelKey: 'documents.vehicleRegistration' },
    { icon: 'person' as keyof typeof ICONS, labelKey: 'documents.nationalId' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('profile.title'), headerTitleStyle: { fontWeight: '600', color: colors.text } }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        <ProfileHeader
          name={profile?.full_name ?? t('profile.driver')}
          role={t('profile.driver')}
          phone={profile?.phone}
        />

        <ProfileStatsRow
          stats={[
            { value: totalDeliveries, label: t('profile.deliveries') },
            { value: rating.toFixed(1), label: t('home.rating') },
            { value: driver?.is_verified ? t('profile.yes') : t('profile.no'), label: t('profile.verified'), valueColor: driver?.is_verified ? colors.primary : colors.danger },
            { value: `${docStatus.approved}/${docStatus.total}`, label: t('profile.docStatus') },
          ]}
        />

        <ProfileCard title={t('profile.vehicleInfo')}>
          <ProfileInfoRow label={t('profile.vehicleType')} value={driver?.vehicle_type || t('profile.notSet')} />
          <ProfileInfoRow label={t('profile.vehiclePlate')} value={driver?.vehicle_plate || t('profile.notSet')} />
          <ProfileInfoRow label={t('profile.vehicleColor')} value={driver?.vehicle_color || t('profile.notSet')} isLast />
        </ProfileCard>

        <ProfileCard title={t('profile.bankAccount')}>
          <ProfileInfoRow label={t('profile.bankName')} value={driver?.bank_name || t('profile.notSet')} />
          <ProfileInfoRow label={t('profile.accountName')} value={driver?.bank_account_name || t('profile.notSet')} />
          <ProfileInfoRow label={t('profile.accountNumber')} value={driver?.bank_account_number || t('profile.notSet')} isLast />
        </ProfileCard>

        <ProfileCard title={t('profile.documents')}>
          {docTypes.map((doc) => (
            <ProfileDocRow
              key={doc.labelKey}
              icon={<MaterialIcons name={ICONS[doc.icon]} size={fontSize.lg} color={colors.text} />}
              label={t(doc.labelKey)}
            />
          ))}
          <TouchableOpacity style={S.manageDocsBtn} onPress={() => router.push('/(app)/(driver)/documents')}>
            <Text style={S.manageDocsText}>{t('profile.manageDocuments')}</Text>
          </TouchableOpacity>
        </ProfileCard>

        <ProfileMenuSection items={menuItems} />

        <Text style={S.memberSince}>
          {t('profile.memberSince', { date: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—' })}
        </Text>

        <ProfileSignOut title={t('auth.signOut')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  manageDocsBtn: { marginTop: spacing.sm, paddingVertical: spacing.sm + spacing.xs, alignItems: 'center', backgroundColor: colors.borderLight, borderRadius: borderRadius.md },
  manageDocsText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary },
  memberSince: { fontSize: fontSize.sm, color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.md },
});
