import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { DriverDocuments } from '../../../src/types/database';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/index';
import { ICONS } from '../../../src/constants/icons';

type DocType = { key: string; label: string; icon: string };

const DOC_TYPES: DocType[] = [
  { key: 'license', label: 'Driver License', icon: ICONS.flag },
  { key: 'vehicle_registration', label: 'Vehicle Registration', icon: ICONS.car },
  { key: 'national_id', label: 'National ID', icon: ICONS.person },
];

function statusBadge(s: string, colors: ReturnType<typeof useColors>): { label: string; bg: string; text: string } {
  const m: Record<string, { label: string; bg: string; text: string }> = {
    approved: { label: 'Approved', bg: colors.successLight, text: colors.success },
    rejected: { label: 'Rejected', bg: colors.dangerLight, text: colors.danger },
    pending: { label: 'Pending Review', bg: colors.infoLight, text: colors.info },
  };
  return m[s] || { label: 'Not Uploaded', bg: colors.borderLight, text: colors.disabled };
}

export default function AccountStatusScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [documents, setDocuments] = useState<Map<string, DriverDocuments>>(new Map());
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const cancelledRef = useRef(false);
  const S = useMemo(() => createStyles(colors, spacing, fontSize, borderRadius, fontWeight), [colors]);

  useEffect(() => {
    if (!profile) return;
    cancelledRef.current = false;

    (async () => {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id, is_verified, total_deliveries, average_rating')
        .eq('profile_id', profile.id)
        .single();

      if (!driver || cancelledRef.current) { setLoading(false); return; }
      setDriverId(driver.id);
      setIsVerified(driver.is_verified);
      setTotalDeliveries(driver.total_deliveries);
      setAverageRating(driver.average_rating);

      const { data: docs } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', driver.id)
        .is('deleted_at', null);

      if (cancelledRef.current) return;

      const docMap = new Map<string, DriverDocuments>();
      (docs ?? []).forEach((d) => {
        if (!docMap.has(d.document_type)) docMap.set(d.document_type, d);
      });
      setDocuments(docMap);

      if (!cancelledRef.current) setLoading(false);
    })();

    return () => { cancelledRef.current = true; };
  }, [profile]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Account Status', headerTitleStyle: { fontWeight: '600', color: colors.text } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Account Status', headerTitleStyle: { fontWeight: '600', color: colors.text } }} />

      <FlatList
        data={DOC_TYPES}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Verification Status Card */}
            <View style={S.verificationCard}>
              <MaterialIcons
                name={isVerified ? ICONS.check : ICONS.lock}
                size={fontSize.giant}
                color={isVerified ? colors.success : colors.textTertiary}
                style={{ marginBottom: spacing.md }}
              />
              <Text style={S.verificationTitle}>
                {isVerified ? 'Account Verified' : 'Verification In Progress'}
              </Text>
              <Text style={S.verificationDesc}>
                {isVerified
                  ? 'Your account is fully verified. You can accept deliveries.'
                  : 'Submit your documents to get verified and start accepting deliveries.'}
              </Text>

              {!isVerified && (
                <View style={S.verificationSteps}>
                  <View style={S.stepRow}>
                    <View style={[S.stepDot, S.stepDotActive]} />
                    <Text style={S.stepText}>Upload required documents</Text>
                  </View>
                  <View style={S.stepRow}>
                    <View style={[S.stepDot, documents.size > 0 ? S.stepDotActive : S.stepDotPending]} />
                    <Text style={S.stepText}>Documents under review</Text>
                  </View>
                  <View style={S.stepRow}>
                    <View style={[S.stepDot, S.stepDotPending]} />
                    <Text style={S.stepText}>Account activated</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Stats Row */}
            <View style={S.statsRow}>
              <View style={S.statCard}>
                <Text style={S.statValue}>{totalDeliveries}</Text>
                <Text style={S.statLabel}>Deliveries</Text>
              </View>
              <View style={S.statCard}>
                <Text style={S.statValue}>{averageRating.toFixed(1)}</Text>
                <Text style={S.statLabel}>Rating</Text>
              </View>
              <View style={S.statCard}>
                <Text style={S.statValue}>{documents.size}/{DOC_TYPES.length}</Text>
                <Text style={S.statLabel}>Documents</Text>
              </View>
            </View>

            {/* Documents Section */}
            <Text style={S.sectionTitle}>Documents</Text>
          </>
        }
        renderItem={({ item }) => {
          const doc = documents.get(item.key);
          const badge = statusBadge(doc?.status ?? 'missing', colors);
          return (
            <TouchableOpacity
              style={S.docCard}
              onPress={() => router.push('/(app)/(driver)/documents')}
              activeOpacity={0.7}
            >
              <View style={S.docLeft}>
                <MaterialIcons name={item.icon as any} size={fontSize.xxl} color={colors.text} />
                <View style={{ marginLeft: spacing.sm }}>
                  <Text style={S.docLabel}>{item.label}</Text>
                  {doc ? (
                    <Text style={S.docInfo}>
                      Uploaded {new Date(doc.created_at).toLocaleDateString()}
                      {doc.expires_at ? ` · Expires ${new Date(doc.expires_at).toLocaleDateString()}` : ''}
                    </Text>
                  ) : (
                    <Text style={S.docMissing}>Not uploaded yet</Text>
                  )}
                </View>
              </View>
              <View style={[S.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[S.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <>
            {isVerified && (
              <View style={S.verifiedBanner}>
                <MaterialIcons name={ICONS.celebration} size={fontSize.xl} color={colors.success} style={{ marginBottom: spacing.sm }} />
                <Text style={S.verifiedBannerText}>
                  You're all set! Your account is verified and you can accept deliveries.
                </Text>
              </View>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>, spacing: any, fontSize: any, borderRadius: any, fontWeight: any) => StyleSheet.create({
  verificationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: 16,
    marginTop: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  verificationTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 8,
  },
  verificationDesc: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  verificationSteps: {
    width: '100%',
    paddingHorizontal: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    marginRight: spacing.md,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotPending: {
    backgroundColor: colors.border,
  },
  stepText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  docLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  docInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  docMissing: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  verifiedBanner: {
    backgroundColor: colors.successLight,
    marginHorizontal: 16,
    marginTop: 16,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  verifiedBannerText: {
    fontSize: fontSize.md,
    color: colors.success,
    textAlign: 'center',
    lineHeight: 20,
  },
});
