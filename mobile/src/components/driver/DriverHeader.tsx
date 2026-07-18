import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface DriverHeaderProps {
  name: string;
  unreadCount: number;
  isOnline: boolean;
  onToggleOnline: () => void;
}

export function DriverHeader({ name, unreadCount, isOnline, onToggleOnline }: DriverHeaderProps) {
  const colors = useColors();

  return (
    <View style={[styles.container]}>
      <View style={styles.topRow}>
        <Text style={[styles.greeting, { color: colors.text }]}>Hi, {name} {'\u{1F44B}'}</Text>
        <TouchableOpacity style={styles.bellWrap} onPress={() => router.push('/(app)/(notifications)')}>
          <Text style={styles.bellIcon}>{'\u{1F514}'}</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text style={[styles.badgeText, { color: '#fff' }]}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
        <View style={styles.toggleLeft}>
          <Text style={styles.powerIcon}>{'\u26A1'}</Text>
          <Text style={[styles.onlineText, { color: colors.text }]}>Online</Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={onToggleOnline}
          trackColor={{ false: colors.disabled, true: colors.primary + '60' }}
          thumbColor={isOnline ? colors.primary : colors.textTertiary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  greeting: { fontSize: fontSize.xl, fontWeight: '700' },
  bellWrap: { position: 'relative', padding: spacing.xs },
  bellIcon: { fontSize: 24 },
  badge: { position: 'absolute', top: 0, right: 0, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  badgeText: { fontSize: 10, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: borderRadius.lg, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  powerIcon: { fontSize: 18 },
  onlineText: { fontSize: fontSize.md, fontWeight: '600' },
});
