import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/index';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../../src/constants/icons';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  reference_type: string | null;
  created_at: string;
}

interface EarningsPeriod {
  deliveries: number;
  earnings: number;
}

function fmtCurr(v: number): string {
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YER`;
}

function fmtDate(s: string): string {
  const d = new Date(s);
  const n = new Date();
  const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (d.toDateString() === n.toDateString()) return `Today, ${t}`;
  const y = new Date(n); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Yesterday, ${t}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${t}`;
}

function transactionIcon(type: string): keyof typeof ICONS {
  const map: Record<string, keyof typeof ICONS> = {
    deposit: 'money',
    withdrawal: 'moneyOff',
    order_payment: 'store',
    commission: 'payment',
    refund: 'refresh',
    payout: 'money',
  };
  return map[type] || 'payment';
}

function transactionLabel(type: string): string {
  const map: Record<string, string> = {
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    order_payment: 'Delivery Payment',
    commission: 'Platform Commission',
    refund: 'Refund',
    payout: 'Payout',
  };
  return map[type] || type.replace(/_/g, ' ');
}

export default function WalletScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [todayEarnings, setTodayEarnings] = useState<EarningsPeriod>({ deliveries: 0, earnings: 0 });
  const [weekEarnings, setWeekEarnings] = useState<EarningsPeriod>({ deliveries: 0, earnings: 0 });
  const [monthEarnings, setMonthEarnings] = useState<EarningsPeriod>({ deliveries: 0, earnings: 0 });
  const cancelledRef = useRef(false);
  const S = useMemo(() => createStyles(colors, spacing, fontSize, borderRadius, fontWeight), [colors]);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    cancelledRef.current = false;

    try {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!driver || cancelledRef.current) return;
      const dId = driver.id;
      if (!cancelledRef.current) setDriverId(dId);

      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (cancelledRef.current) return;

      if (wallet) {
        setBalance(wallet.balance);

        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

        const [
          { data: txData },
          { data: todayData },
          { data: weekData },
          { data: monthData },
        ] = await Promise.all([
          supabase.from('wallet_transactions')
            .select('id, amount, type, description, reference_type, created_at')
            .eq('wallet_id', wallet.id)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase.from('delivery_orders').select('driver_earnings').eq('assigned_driver_id', dId).eq('status', 'delivered').gte('delivered_at', todayStart.toISOString()),
          supabase.from('delivery_orders').select('driver_earnings').eq('assigned_driver_id', dId).eq('status', 'delivered').gte('delivered_at', weekStart.toISOString()),
          supabase.from('delivery_orders').select('driver_earnings').eq('assigned_driver_id', dId).eq('status', 'delivered').gte('delivered_at', monthStart.toISOString()),
        ]);

        if (cancelledRef.current) return;

        if (txData) setTransactions(txData as Transaction[]);
        if (todayData) setTodayEarnings({
          deliveries: todayData.length,
          earnings: todayData.reduce((s, r) => s + (r.driver_earnings ?? 0), 0),
        });
        if (weekData) setWeekEarnings({
          deliveries: weekData.length,
          earnings: weekData.reduce((s, r) => s + (r.driver_earnings ?? 0), 0),
        });
        if (monthData) setMonthEarnings({
          deliveries: monthData.length,
          earnings: monthData.reduce((s, r) => s + (r.driver_earnings ?? 0), 0),
        });
      }
    } catch {
      // fetch failed — show default state
    }

    if (!cancelledRef.current) setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchData();
    return () => { cancelledRef.current = true; };
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Wallet', headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Wallet', headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Balance Card */}
            <View style={S.balanceCard}>
              <TouchableOpacity onPress={() => setShowBalance(!showBalance)} style={S.balanceHeader}>
                <Text style={S.balanceLabel}>Total Balance</Text>
                <MaterialIcons name={showBalance ? ICONS.visibility : ICONS.visibilityOff} size={fontSize.xl} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={S.balanceValue}>
                {showBalance ? fmtCurr(balance ?? 0) : '••••••'}
              </Text>
            </View>

            {/* Earnings Period Cards */}
            <View style={S.periodRow}>
              <View style={[S.periodCard, { marginRight: 6 }]}>
                <Text style={S.periodLabel}>Today</Text>
                <Text style={S.periodValue}>{fmtCurr(todayEarnings.earnings)}</Text>
                <Text style={S.periodDeliveries}>{todayEarnings.deliveries} deliveries</Text>
              </View>
              <View style={[S.periodCard, { marginHorizontal: 6 }]}>
                <Text style={S.periodLabel}>This Week</Text>
                <Text style={S.periodValue}>{fmtCurr(weekEarnings.earnings)}</Text>
                <Text style={S.periodDeliveries}>{weekEarnings.deliveries} deliveries</Text>
              </View>
              <View style={[S.periodCard, { marginLeft: 6 }]}>
                <Text style={S.periodLabel}>This Month</Text>
                <Text style={S.periodValue}>{fmtCurr(monthEarnings.earnings)}</Text>
                <Text style={S.periodDeliveries}>{monthEarnings.deliveries} deliveries</Text>
              </View>
            </View>

            {/* Transactions Header */}
            <View style={S.sectionHeader}>
              <Text style={S.sectionTitle}>Transaction History</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: spacing.xxl }}>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>No transactions yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isPositive = item.amount > 0;
          return (
            <View style={S.txCard}>
              <View style={S.txLeft}>
                <MaterialIcons name={ICONS[transactionIcon(item.type)]} size={fontSize.xl} color={colors.text} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={S.txType}>{transactionLabel(item.type)}</Text>
                  <Text style={S.txDesc}>{item.description || fmtDate(item.created_at)}</Text>
                </View>
              </View>
              <Text style={[S.txAmount, { color: isPositive ? colors.primary : colors.danger }]}>
                {isPositive ? '+' : ''}{fmtCurr(item.amount)}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>, spacing: any, fontSize: any, borderRadius: any, fontWeight: any) => StyleSheet.create({
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  balanceLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  balanceValue: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  periodRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm + spacing.xs,
  },
  periodCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  periodValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  periodDeliveries: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  sectionHeader: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  txCard: {
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
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  txType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  txDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});
