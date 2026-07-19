import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { router } from 'expo-router';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, fontWeight } from '../../../src/theme/spacing';
import { ScreenLayout } from '../../../src/components/ui/ScreenLayout';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { useStoreDashboard } from '../../../src/hooks/store/use-store-dashboard';
import { DashboardHeader } from '../../../src/components/store/DashboardHeader';
import { StatisticCard } from '../../../src/components/store/StatisticCard';
import { QuickActionCard } from '../../../src/components/store/QuickActionCard';
import { RecentOrderItem } from '../../../src/components/store/RecentOrderItem';

export default function StoreDashboardScreen() {
  const colors = useColors();
  const { store, stats, recentOrders, wallet, loading, error, refreshing, refresh } = useStoreDashboard();

  const handleCreateOrder = useCallback(() => {
    router.push('/(app)/(store)/create-order');
  }, []);

  const handleComingSoon = useCallback((feature: string) => {
    Alert.alert('Coming Soon', `${feature} will be available in the next phase.`);
  }, []);

  const handleViewAllOrders = useCallback(() => {
    router.push('/(app)/(store)/orders');
  }, []);

  const handleCustomers = useCallback(() => {
    router.push('/(app)/(store)/customers');
  }, []);

  const handleSettings = useCallback(() => {
    router.push('/(app)/(store)/settings');
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState icon={'\u274C'} title="Something went wrong" subtitle={error} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState icon={'\uD83C\uDFEA'} title="No Store Found" subtitle="Please complete your store setup to access the dashboard." />
      </View>
    );
  }

  return (
    <ScreenLayout refreshing={refreshing} onRefresh={refresh}>
      <DashboardHeader store={store} wallet={wallet} />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <QuickActionCard icon="add-circle" label="Create Order" onPress={handleCreateOrder} />
        <QuickActionCard icon="assignment" label="All Orders" onPress={handleViewAllOrders} />
        <QuickActionCard icon="people" label="Customers" onPress={handleCustomers} />
        <QuickActionCard icon="settings" label="Settings" onPress={handleSettings} />
      </View>

      {stats && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Summary</Text>
          <View style={styles.statsGrid}>
            <StatisticCard icon="receipt-long" value={stats.totalToday} label="Total Orders" color={colors.primary} bgColor={colors.primaryLight} />
            <StatisticCard icon="hourglass-empty" value={stats.pendingCount} label="Pending" color={colors.statusDraft} bgColor={colors.borderLight} />
            <StatisticCard icon="local-shipping" value={stats.driverProcessingCount} label="Processing" color={colors.statusAssigned} bgColor={colors.purpleLight} />
            <StatisticCard icon="directions-car" value={stats.inTransitCount} label="In Transit" color={colors.statusInTransit} bgColor={colors.warningLight} />
            <StatisticCard icon="check-circle" value={stats.deliveredCount} label="Delivered" color={colors.statusDelivered} bgColor={colors.successLight} />
            <StatisticCard icon="cancel" value={stats.cancelledCount} label="Cancelled" color={colors.statusCancelled} bgColor={colors.dangerLight} />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Revenue</Text>
          <View style={styles.statsGrid}>
            <StatisticCard icon="attach-money" value={`$${stats.totalDeliveryFees.toFixed(2)}`} label="Delivery Fees" color={colors.secondary} bgColor={colors.secondaryLight} />
            <StatisticCard icon="payment" value={`$${stats.totalCommission.toFixed(2)}`} label="Commission" color={colors.info} bgColor={colors.infoLight} />
          </View>
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Orders</Text>
      {recentOrders.length === 0 ? (
        <EmptyState icon={'\uD83D\uDCCB'} title="No orders yet" subtitle="Create your first delivery order to get started" />
      ) : (
        recentOrders.map((order) => (
          <RecentOrderItem key={order.id} order={order} />
        ))
      )}

      {recentOrders.length > 0 && (
        <TouchableOpacity style={styles.viewAllBtn} onPress={handleViewAllOrders}>
          <Text style={[styles.viewAllText, { color: colors.primary }]}>View All Orders</Text>
          <MaterialIcons name="arrow-forward" size={fontSize.md} color={colors.primary} />
        </TouchableOpacity>
      )}

      {stats && (
        <View style={styles.bottomSection}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            {stats.totalToday} order{stats.totalToday !== 1 ? 's' : ''} today {'\u00B7'} {stats.deliveredCount} delivered
          </Text>
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.sm, marginTop: spacing.xs },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
  viewAllText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginRight: spacing.xs },
  bottomSection: { alignItems: 'center', paddingVertical: spacing.md },
  footerText: { fontSize: fontSize.sm, textAlign: 'center' },
});
