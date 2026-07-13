import { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { theme } from '../../../src/theme/driver-theme';

interface BonusPeriod {
  label: string;
  bonus: number;
  count: number;
  icon: string;
}

const ACHIEVEMENTS = [
  { icon: '\u{1F3C6}', label: 'First Delivery', desc: 'Complete your first delivery', max: 1 },
  { icon: '\u{1F4AF}', label: '5 Star Service', desc: 'Maintain 5.0 rating for 10 deliveries', max: 10 },
  { icon: '\u{26A1}', label: 'Speed Demon', desc: 'Complete 5 deliveries in one day', max: 5 },
  { icon: '\u{1F3C1}', label: 'Weekend Warrior', desc: 'Complete 20 deliveries in a week', max: 20 },
  { icon: '\u{1F31F}', label: 'Top Rated', desc: 'Reach 50 total deliveries', max: 50 },
  { icon: '\u{1F4B0}', label: 'Money Maker', desc: 'Earn 10,000 YER total', max: 10000 },
];

function fmtCurr(v: number): string {
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YER`;
}

export default function RewardsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [weeklyBonuses, setWeeklyBonuses] = useState<BonusPeriod[]>([]);
  const [rating, setRating] = useState(0);
  const [weeklyDeliveries, setWeeklyDeliveries] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!profile) return;
    cancelledRef.current = false;

    (async () => {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id, average_rating, total_deliveries')
        .eq('profile_id', profile.id)
        .single();

      if (!driver || cancelledRef.current) { setLoading(false); return; }
      setRating(driver.average_rating);
      setTotalDeliveries(driver.total_deliveries);

      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);

      const [{ data: earnings }, { data: wDeliveries }, { data: wBonus }, { data: mBonus }] = await Promise.all([
        supabase.from('delivery_orders').select('driver_earnings, reward_bonus').eq('assigned_driver_id', driver.id).eq('status', 'delivered'),
        supabase.from('delivery_orders').select('id').eq('assigned_driver_id', driver.id).eq('status', 'delivered').gte('delivered_at', weekStart.toISOString()),
        supabase.from('delivery_orders').select('driver_earnings, reward_bonus').eq('assigned_driver_id', driver.id).eq('status', 'delivered').gte('delivered_at', weekStart.toISOString()),
        supabase.from('delivery_orders').select('driver_earnings, reward_bonus').eq('assigned_driver_id', driver.id).eq('status', 'delivered').gte('delivered_at', monthStart.toISOString()),
      ]);

      if (cancelledRef.current) return;

      setTotalEarnings((earnings ?? []).reduce((s, r) => s + (r.driver_earnings ?? 0), 0));
      setWeeklyDeliveries(wDeliveries?.length ?? 0);

      const wkBonusRows = (wBonus ?? []).filter(r => (r.reward_bonus ?? 0) > 0);
      const moBonusRows = (mBonus ?? []).filter(r => (r.reward_bonus ?? 0) > 0);
      const wkBonus = wkBonusRows.reduce((s, r) => s + (r.reward_bonus ?? 0), 0);
      const moBonus = moBonusRows.reduce((s, r) => s + (r.reward_bonus ?? 0), 0);
      const allBonusRows = (earnings ?? []).filter(r => (r.reward_bonus ?? 0) > 0);
      const allBonus = allBonusRows.reduce((s, r) => s + (r.reward_bonus ?? 0), 0);

      setWeeklyBonuses([
        { label: 'This Week', bonus: wkBonus, count: wkBonusRows.length, icon: '\u{1F4C5}' },
        { label: 'This Month', bonus: moBonus, count: moBonusRows.length, icon: '\u{1F4C6}' },
        { label: 'All Time', bonus: allBonus, count: allBonusRows.length, icon: '\u{1F3C6}' },
      ]);

      if (!cancelledRef.current) setLoading(false);
    })();

    return () => { cancelledRef.current = true; };
  }, [profile]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <Stack.Screen options={{ title: 'Rewards', headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: 'Rewards', headerTitleStyle: { fontWeight: '600', color: theme.white } }} />

      <FlatList
        data={ACHIEVEMENTS}
        keyExtractor={(item) => item.label}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Summary Card */}
            <View style={S.summaryCard}>
              <Text style={S.summaryValue}>{fmtCurr(totalEarnings)}</Text>
              <Text style={S.summaryLabel}>Lifetime Earnings</Text>
              <View style={S.summaryRow}>
                <View style={S.summaryItem}>
                  <Text style={S.summaryItemValue}>{totalDeliveries}</Text>
                  <Text style={S.summaryItemLabel}>Deliveries</Text>
                </View>
                <View style={S.summaryDivider} />
                <View style={S.summaryItem}>
                  <Text style={S.summaryItemValue}>{rating.toFixed(1)}</Text>
                  <Text style={S.summaryItemLabel}>Rating</Text>
                </View>
                <View style={S.summaryDivider} />
                <View style={S.summaryItem}>
                  <Text style={S.summaryItemValue}>{weeklyDeliveries}</Text>
                  <Text style={S.summaryItemLabel}>This Week</Text>
                </View>
              </View>
            </View>

            {/* Bonuses */}
            <Text style={S.sectionTitle}>Bonus Earnings</Text>
            {weeklyBonuses.map((p) => (
              <View key={p.label} style={S.bonusCard}>
                <View style={S.bonusLeft}>
                  <Text style={{ fontSize: 24 }}>{p.icon}</Text>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={S.bonusLabel}>{p.label}</Text>
                    <Text style={S.bonusCount}>{p.count} bonuses earned</Text>
                  </View>
                </View>
                <Text style={S.bonusValue}>{fmtCurr(p.bonus)}</Text>
              </View>
            ))}

            {/* Achievements */}
            <Text style={S.sectionTitle}>Achievements</Text>
          </>
        }
        renderItem={({ item }) => {
          const progress = Math.min(
            item.label === 'Money Maker' ? totalEarnings / item.max :
            item.label === 'Top Rated' ? totalDeliveries / item.max :
            weeklyDeliveries / item.max,
            1
          );
          const unlocked = progress >= 1;
          return (
            <View style={[S.achieveCard, unlocked && S.achieveCardUnlocked]}>
              <Text style={{ fontSize: 28, opacity: unlocked ? 1 : 0.4 }}>{item.icon}</Text>
              <View style={{ flex: 1, marginLeft: 14, marginRight: 12 }}>
                <Text style={[S.achieveLabel, unlocked && S.achieveLabelUnlocked]}>{item.label}</Text>
                <Text style={S.achieveDesc}>{item.desc}</Text>
                {!unlocked && (
                  <View style={S.achieveProgressBg}>
                    <View style={[S.achieveProgressFill, { width: `${Math.round(progress * 100)}%` }]} />
                  </View>
                )}
              </View>
              {unlocked && <Text style={{ fontSize: 20 }}>{'\u{2705}'}</Text>}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  summaryCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    marginHorizontal: 16,
    marginTop: 16,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: theme.fontSize.hero,
    fontWeight: theme.fontWeight.bold,
    color: theme.green,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: theme.fontSize.md,
    color: theme.gray,
    fontWeight: theme.fontWeight.medium,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryItemValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.white,
    marginBottom: 2,
  },
  summaryItemLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.gray,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.white,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  bonusCard: {
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
  bonusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bonusLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.white,
  },
  bonusCount: {
    fontSize: theme.fontSize.sm,
    color: theme.gray,
    marginTop: 2,
  },
  bonusValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.green,
  },
  achieveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    opacity: 0.7,
  },
  achieveCardUnlocked: {
    opacity: 1,
    borderColor: theme.greenDark,
  },
  achieveLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.gray,
    marginBottom: 2,
  },
  achieveLabelUnlocked: {
    color: theme.greenLight,
  },
  achieveDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.dim,
    marginBottom: 6,
  },
  achieveProgressBg: {
    height: 4,
    backgroundColor: theme.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  achieveProgressFill: {
    height: 4,
    backgroundColor: theme.green,
    borderRadius: 2,
  },
});
