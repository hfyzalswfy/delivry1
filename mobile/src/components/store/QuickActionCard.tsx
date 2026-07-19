import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../theme/spacing';

interface QuickActionCardProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  disabledHint?: string;
}

export function QuickActionCard({ icon, label, onPress, disabled, disabledHint }: QuickActionCardProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: disabled ? colors.border : colors.primary,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <MaterialIcons
        name={icon}
        size={24}
        color={disabled ? colors.textTertiary : colors.primary}
      />
      <Text
        style={[
          styles.label,
          { color: disabled ? colors.textTertiary : colors.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {disabled && disabledHint && (
        <Text style={[styles.hint, { color: colors.textTertiary }]} numberOfLines={1}>
          {disabledHint}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg, borderWidth: 1,
    borderStyle: 'dashed', minHeight: 80,
  },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: spacing.xs, textAlign: 'center' },
  hint: { fontSize: fontSize.xxs, marginTop: 2, textAlign: 'center' },
});
