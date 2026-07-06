import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }: ButtonProps) {
  const bgColors = {
    primary: colors.primary,
    secondary: colors.secondary,
    danger: colors.danger,
    ghost: 'transparent',
  };

  const textColors = {
    primary: '#fff',
    secondary: '#fff',
    danger: '#fff',
    ghost: colors.primary,
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: bgColors[variant] },
        variant === 'ghost' && styles.ghostButton,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} />
      ) : (
        <Text style={[styles.text, { color: textColors[variant] }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  ghostButton: { borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.6 },
  text: { fontSize: fontSize.md, fontWeight: '600' },
});
