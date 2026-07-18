import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize } from '../../theme/spacing';

interface SettingsRowProps {
  label: string;
  value?: string;
  icon?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
}

export function SettingsRow({ label, value, icon, onPress, toggle, toggleValue, onToggle, danger }: SettingsRowProps) {
  const colors = useColors();

  const content = (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.left}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.label, danger && { color: colors.danger }]}>{label}</Text>
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.disabled, true: colors.primary + '60' }}
          thumbColor={toggleValue ? colors.primary : colors.textTertiary}
        />
      ) : value ? (
        <Text style={[styles.value, { color: colors.textTertiary }]}>{value}</Text>
      ) : onPress ? (
        <Text style={[styles.arrow, { color: colors.textTertiary }]}>{'\u{203A}'}</Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1 },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icon: { fontSize: fontSize.lg, marginRight: spacing.sm },
  label: { fontSize: fontSize.md, fontWeight: '500' },
  value: { fontSize: fontSize.sm, marginLeft: spacing.sm },
  arrow: { fontSize: fontSize.xl, marginLeft: spacing.sm },
});
