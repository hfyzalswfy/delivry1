import { colors, darkColors } from './colors';
import { spacing, fontSize, borderRadius, fontWeight, lineHeight, shadow } from './spacing';
import type { ColorScheme } from './colors';

export { colors, darkColors, spacing, fontSize, borderRadius, fontWeight, lineHeight, shadow };
export type { ColorScheme };

export const typography = {
  h1: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, lineHeight: fontSize.xxl * lineHeight.tight },
  h2: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, lineHeight: fontSize.xl * lineHeight.tight },
  h3: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, lineHeight: fontSize.lg * lineHeight.tight },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.normal, lineHeight: fontSize.md * lineHeight.normal },
  bodySmall: { fontSize: fontSize.sm, fontWeight: fontWeight.normal, lineHeight: fontSize.sm * lineHeight.normal },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.normal, lineHeight: fontSize.xs * lineHeight.normal },
  button: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, lineHeight: fontSize.md * lineHeight.tight },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, lineHeight: fontSize.xs * lineHeight.tight, letterSpacing: 1 },
};

export const layout = {
  screenPadding: spacing.md,
  screenPaddingHorizontal: spacing.md,
  sectionGap: spacing.lg,
  itemGap: spacing.md,
  cardGap: spacing.md,
  contentGap: spacing.sm,

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  containerDark: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDark: {
    backgroundColor: darkColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  section: {
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  dividerDark: {
    height: 1,
    backgroundColor: darkColors.border,
    marginVertical: spacing.md,
  },
};
