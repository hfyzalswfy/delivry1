import { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { DriverDocuments } from '../../../src/types/database';
import { theme } from '../../../src/theme/driver-theme';

type DocType = { key: string; label: string; icon: string };

const DOC_TYPES: DocType[] = [
  { key: 'license', label: 'Driver License', icon: '\u{1F3C1}' },
  { key: 'vehicle_registration', label: 'Vehicle Registration', icon: '\u{1F697}' },
  { key: 'national_id', label: 'National ID', icon: '\u{1F464}' },
];

function statusBadge(s: string): { label: string; bg: string; text: string } {
  const m: Record<string, { label: string; bg: string; text: string }> = {
    approved: { label: 'Approved', bg: theme.statusDelivered, text: theme.statusDeliveredText },
    rejected: { label: 'Rejected', bg: theme.statusCancelled, text: theme.statusCancelledText },
    pending: { label: 'Pending Review', bg: theme.statusPending, text: theme.statusPendingText },
  };
  return m[s] || { label: 'Not Uploaded', bg: theme.disabledBg, text: theme.disabledText };
}

export default function AccountStatusScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [documents, setDocuments] = useState<Map<string, DriverDocuments>>(new Map());
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const cancelledRef = useRef(false);

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
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <Stack.Screen options={{ title: 'Account Status', headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: 'Account Status', headerTitleStyle: { fontWeight: '600', color: theme.white } }} />

      <FlatList
        data={DOC_TYPES}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Verification Status Card */}
            <View style={S.verificationCard}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>
                {isVerified ? '\u{2705}' : '\u{1F512}'}
              </Text>
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
          const badge = statusBadge(doc?.status ?? 'missing');
          return (
            <TouchableOpacity
              style={S.docCard}
              onPress={() => router.push('/(app)/(driver)/documents')}
              activeOpacity={0.7}
            >
              <View style={S.docLeft}>
                <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                <View style={{ marginLeft: 12 }}>
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
                <Text style={{ fontSize: 20, marginBottom: 8 }}>{'\u{1F389}'}</Text>
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

const S = StyleSheet.create({
  verificationCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    marginHorizontal: 16,
    marginTop: 16,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  verificationTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.white,
    marginBottom: 8,
  },
  verificationDesc: {
    fontSize: theme.fontSize.md,
    color: theme.gray,
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
    borderRadius: 6,
    marginRight: 12,
  },
  stepDotActive: {
    backgroundColor: theme.green,
  },
  stepDotPending: {
    backgroundColor: theme.pendingDot,
  },
  stepText: {
    fontSize: theme.fontSize.md,
    color: theme.white,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.white,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.gray,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.white,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.card,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  docLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.white,
  },
  docInfo: {
    fontSize: theme.fontSize.sm,
    color: theme.gray,
    marginTop: 2,
  },
  docMissing: {
    fontSize: theme.fontSize.sm,
    color: theme.dim,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  statusBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  verifiedBanner: {
    backgroundColor: theme.statusDelivered,
    marginHorizontal: 16,
    marginTop: 16,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.greenDark,
  },
  verifiedBannerText: {
    fontSize: theme.fontSize.md,
    color: theme.statusDeliveredText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
