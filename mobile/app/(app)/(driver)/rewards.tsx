import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/index';
import { ICONS } from '../../../src/constants/icons';

interface BonusPeriod {
  label: string;
  bonus: number;
  count: number;
  icon: string;
}

const ACHIEVEMENTS: Array<{ icon: string; label: string; desc: string; max: number }> = [
  { icon: ICONS.stars, label: 'First Delivery', desc: 'Complete your first delivery', max: 1 },
  { icon: ICONS.favorite, label: '5 Star Service', desc: 'Maintain 5.0 rating for 10 deliveries', max: 10 },
  { icon: ICONS.bolt, label: 'Speed Demon', desc: 'Complete 5 deliveries in one day', max: 5 },
  { icon: ICONS.flag, label: 'Weekend Warrior', desc: 'Complete 20 deliveries in a week', max: 20 },
  { icon: ICONS.stars, label: 'Top Rated', desc: 'Reach 50 total deliveries', max: 50 },
  { icon: ICONS.money, label: 'Money Maker', desc: 'Earn 10,000 YER total', max: 10000 },
];

function fmtCurr(v: number): string {
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YER`;
}

export default function RewardsScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [weeklyBonuses, setWeeklyBonuses] = useState<BonusPeriod[]>([]);
  const [rating, setRating] = useState(0);
  const [weeklyDeliveries, setWeeklyDeliveries] = useState(0);
  const cancelledRef = useRef(false);
  const S = useMemo(() => createStyles(colors, spacing, fontSize, borderRadius, fontWeight), [colors]);

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
        { label: 'This Week', bonus: wkBonus, count: wkBonusRows.length, icon: ICONS.calendar },
        { label: 'This Month', bonus: moBonus, count: moBonusRows.length, icon: ICONS.calendar },
        { label: 'All Time', bonus: allBonus, count: allBonusRows.length, icon: ICONS.stars },
      ]);

      if (!cancelledRef.current) setLoading(false);
    })();

    return () => { cancelledRef.current = true; };
  }, [profile]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Rewards', headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Rewards', headerTitleStyle: { fontWeight: '600', color: colors.text } }} />

      <FlatList
        data={ACHIEVEMENTS}
        keyExtractor={(item) => item.label}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
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
                  <MaterialIcons name={p.icon as any} size={fontSize.xxl} color={colors.text} />
                  <View style={{ marginLeft: spacing.md }}>
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
              <MaterialIcons name={item.icon as any} size={fontSize.xxxl} color={colors.text} style={{ opacity: unlocked ? 1 : 0.4 }} />
              <View style={{ flex: 1, marginLeft: spacing.md, marginRight: spacing.md }}>
                <Text style={[S.achieveLabel, unlocked && S.achieveLabelUnlocked]}>{item.label}</Text>
                <Text style={S.achieveDesc}>{item.desc}</Text>
                {!unlocked && (
                  <View style={S.achieveProgressBg}>
                    <View style={[S.achieveProgressFill, { width: `${Math.round(progress * 100)}%` }]} />
                  </View>
                )}
              </View>
              {unlocked && <MaterialIcons name={ICONS.check} size={fontSize.xl} color={colors.primary} />}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>, spacing: any, fontSize: any, borderRadius: any, fontWeight: any) => StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.lg - spacing.xs,
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
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  summaryItemLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm + spacing.xs,
  },
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bonusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bonusLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  bonusCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bonusValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  achieveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.7,
  },
  achieveCardUnlocked: {
    opacity: 1,
    borderColor: colors.primaryLight,
  },
  achieveLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  achieveLabelUnlocked: {
    color: colors.primary,
  },
  achieveDesc: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing.xs + 2,
  },
  achieveProgressBg: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  achieveProgressFill: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
});
