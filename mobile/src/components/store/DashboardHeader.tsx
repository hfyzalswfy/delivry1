import { View, Text, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../theme/spacing';
import { Stores, Wallets } from '../../types/database';

interface DashboardHeaderProps {
  store: Stores;
  wallet: Wallets | null;
}

export function DashboardHeader({ store, wallet }: DashboardHeaderProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        {store.logo_url ? (
          <Image source={{ uri: store.logo_url }} style={styles.logo} />
        ) : (
          <View style={[styles.logoPlaceholder, { backgroundColor: colors.primaryLight }]}>
            <MaterialIcons name="storefront" size={24} color={colors.primary} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{store.name}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: store.is_active ? colors.statusDelivered : colors.statusCancelled }]} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {store.is_active ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>
      </View>
      {wallet && (
        <View style={[styles.walletBadge, { backgroundColor: colors.primaryLight }]}>
          <MaterialIcons name="account-balance-wallet" size={16} color={colors.primary} />
          <Text style={[styles.walletAmount, { color: colors.primaryDark }]}>
            ${Number(wallet.balance).toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 48, height: 48, borderRadius: borderRadius.md, marginRight: spacing.md },
  logoPlaceholder: { width: 48, height: 48, borderRadius: borderRadius.md, marginRight: spacing.md, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: spacing.xs, marginRight: spacing.sm },
  statusText: { fontSize: fontSize.sm },
  walletBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, marginTop: spacing.sm,
  },
  walletAmount: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginLeft: spacing.xs },
});
