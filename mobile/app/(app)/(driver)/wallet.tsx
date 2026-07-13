import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { theme } from '../../../src/theme/driver-theme';

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

function transactionIcon(type: string): string {
  const map: Record<string, string> = {
    deposit: '\u{1F4B5}',
    withdrawal: '\u{1F4B4}',
    order_payment: '\u{1F3EA}',
    commission: '\u{1F4B0}',
    refund: '\u{1F504}',
    payout: '\u{1F4B8}',
  };
  return map[type] || '\u{1F4B0}';
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

  const fetchData = useCallback(async () => {
    if (!profile) return;
    cancelledRef.current = false;

    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (!driver || cancelledRef.current) return;
    const dId = driver.id;
    if (!cancelledRef.current) setDriverId(dId);

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [
      { data: wallet },
      { data: txData },
      { data: todayData },
      { data: weekData },
      { data: monthData },
    ] = await Promise.all([
      supabase.from('wallets').select('balance').eq('profile_id', profile.id).single(),
      supabase.from('wallet_transactions')
        .select('id, amount, type, description, reference_type, created_at')
        .eq('wallet_id', (await supabase.from('wallets').select('id').eq('profile_id', profile.id).single()).data?.id || '')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('delivery_orders').select('driver_earnings').eq('assigned_driver_id', dId).eq('status', 'delivered').gte('delivered_at', todayStart.toISOString()),
      supabase.from('delivery_orders').select('driver_earnings').eq('assigned_driver_id', dId).eq('status', 'delivered').gte('delivered_at', weekStart.toISOString()),
      supabase.from('delivery_orders').select('driver_earnings').eq('assigned_driver_id', dId).eq('status', 'delivered').gte('delivered_at', monthStart.toISOString()),
    ]);

    if (cancelledRef.current) return;

    if (wallet) setBalance(wallet.balance);

    if (txData) {
      setTransactions(txData as Transaction[]);
    }

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
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <Stack.Screen options={{ title: 'Wallet', headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: 'Wallet', headerTitleStyle: { fontWeight: '600', color: theme.white } }} />

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Balance Card */}
            <View style={S.balanceCard}>
              <TouchableOpacity onPress={() => setShowBalance(!showBalance)} style={S.balanceHeader}>
                <Text style={S.balanceLabel}>Total Balance</Text>
                <Text style={S.eyeIcon}>{showBalance ? '\u{1F441}' : '\u{1F648}'}</Text>
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
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 14, color: theme.gray }}>No transactions yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isPositive = item.amount > 0;
          return (
            <View style={S.txCard}>
              <View style={S.txLeft}>
                <Text style={{ fontSize: 20 }}>{transactionIcon(item.type)}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={S.txType}>{transactionLabel(item.type)}</Text>
                  <Text style={S.txDesc}>{item.description || fmtDate(item.created_at)}</Text>
                </View>
              </View>
              <Text style={[S.txAmount, { color: isPositive ? theme.greenLight : theme.red }]}>
                {isPositive ? '+' : ''}{fmtCurr(item.amount)}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  balanceCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    marginHorizontal: 16,
    marginTop: 16,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.border,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: theme.fontSize.md,
    color: theme.gray,
    fontWeight: theme.fontWeight.medium,
  },
  eyeIcon: {
    fontSize: 20,
  },
  balanceValue: {
    fontSize: theme.fontSize.hero,
    fontWeight: theme.fontWeight.bold,
    color: theme.green,
  },
  periodRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
  },
  periodCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  periodLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.gray,
    fontWeight: theme.fontWeight.semibold,
    marginBottom: 4,
  },
  periodValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.white,
    marginBottom: 2,
  },
  periodDeliveries: {
    fontSize: theme.fontSize.xs,
    color: theme.dim,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.white,
  },
  txCard: {
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
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  txType: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.white,
  },
  txDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.gray,
    marginTop: 2,
  },
  txAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
});
