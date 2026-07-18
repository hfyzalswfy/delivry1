import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import { IconName, ICONS } from '../../constants/icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: IconName;
  iconSize?: number;
}

const variantBg: Record<string, string> = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'danger',
  outline: 'transparent',
  ghost: 'transparent',
  success: 'success',
  warning: 'warning',
};

const variantTextColor: Record<string, string> = {
  primary: '#fff',
  secondary: '#fff',
  danger: '#fff',
  outline: 'primary',
  ghost: 'primary',
  success: '#fff',
  warning: '#fff',
};

const sizeHeight = { sm: 36, md: 48, lg: 56 } as const;
const sizePadding = { sm: spacing.sm, md: spacing.md, lg: spacing.lg } as const;
const sizeFont = { sm: fontSize.sm, md: fontSize.md, lg: fontSize.lg } as const;
const sizeIcon = { sm: 16, md: 20, lg: 24 } as const;

export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, style, icon, iconSize }: ButtonProps) {
  const colors = useColors();
  const bgColor = variantBg[variant] === 'transparent' ? 'transparent' : colors[variantBg[variant] as keyof typeof colors] as string;
  const tcValue = variantTextColor[variant];
  const textColor = tcValue === '#fff' ? '#fff' : colors[tcValue as keyof typeof colors] as string;
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      style={[styles.base, {
        backgroundColor: bgColor,
        height: sizeHeight[size],
        paddingHorizontal: sizePadding[size],
      }, (isOutline || isGhost) && { borderWidth: 1, borderColor: isGhost ? 'transparent' : colors.border }, (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityLabel={title}
      accessibilityRole="button"
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && (
            <MaterialIcons
              name={ICONS[icon] as any}
              size={iconSize ?? sizeIcon[size]}
              color={textColor}
              style={{ marginRight: spacing.xs }}
            />
          )}
          <Text style={[styles.text, { color: textColor, fontSize: sizeFont[size] }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  disabled: { opacity: 0.6 },
  text: { fontWeight: '600' },
});
