import { View, StyleSheet, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, borderRadius, shadow as shadowToken } from '../../theme/spacing';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof spacing;
  noBorder?: boolean;
  elevated?: boolean;
}

export function Card({ children, style, padding = 'md', noBorder, elevated }: CardProps) {
  const colors = useColors();
  return (
    <View
      style={[{
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing[padding],
        borderWidth: noBorder ? 0 : 1,
        borderColor: colors.border,
      }, elevated && shadowToken.md, style]}
    >
      {children}
    </View>
  );
}

interface CardRowProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function CardRow({ children, style }: CardRowProps) {
  return <View style={[styles.row, style]}>{children}</View>;
}

interface CardDividerProps {
  style?: ViewStyle;
}

export function CardDivider({ style }: CardDividerProps) {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, marginVertical: spacing.sm },
});
