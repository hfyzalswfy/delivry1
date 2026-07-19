import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../theme/spacing';
import { ICONS } from '../../constants/icons';

interface MenuItem {
  icon: keyof typeof ICONS;
  label: string;
  route?: string;
  onPress?: () => void;
}

interface ProfileMenuSectionProps {
  items: MenuItem[];
}

export function ProfileMenuSection({ items }: ProfileMenuSectionProps) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      {items.map((item, idx) => (
        <TouchableOpacity
          key={idx}
          style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            if (item.onPress) item.onPress();
            else if (item.route) router.push(item.route as any);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.itemLeft}>
            <MaterialIcons name={ICONS[item.icon]} size={fontSize.xl} color={colors.text} />
            <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
          </View>
          <MaterialIcons name={ICONS.chevronRight} size={fontSize.xxl} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.sm },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  itemLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginLeft: spacing.sm + spacing.xs },
});
