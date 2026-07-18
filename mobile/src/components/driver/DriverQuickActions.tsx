import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

export function DriverQuickActions() {
  const colors = useColors();

  const actions = [
    { icon: '\u{1F5FA}\u{FE0F}', label: 'Browse Orders', onPress: () => router.push('/(app)/(driver)/orders') },
    { icon: '\u{1F9FE}', label: 'Wallet', onPress: () => router.push('/(app)/(driver)/wallet') },
    { icon: '\u{1F381}', label: 'Rewards', onPress: () => router.push('/(app)/(driver)/rewards') },
    { icon: '\u{1F550}', label: 'My Orders', onPress: () => router.push('/(app)/(driver)/orders') },
  ];

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.text }]}>Quick Actions</Text>
      <View style={styles.row}>
        {actions.map((a, i) => (
          <TouchableOpacity key={i} style={styles.btn} onPress={a.onPress} activeOpacity={0.7}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <Text style={styles.icon}>{a.icon}</Text>
              {i === 2 && <View style={[styles.notifDot, { backgroundColor: colors.danger }]} />}
            </View>
            <Text style={[styles.label, { color: colors.textTertiary }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg, paddingHorizontal: spacing.lg },
  title: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { alignItems: 'center', width: '22%' },
  iconWrap: { position: 'relative', width: 56, height: 56, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  icon: { fontSize: 24 },
  notifDot: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: fontSize.xs, textAlign: 'center' },
});
