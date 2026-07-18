import { colors, darkColors, spacing, fontSize, borderRadius, fontWeight, lineHeight, shadow } from './index';

export interface ThemeValues {
  bg: string; surface: string; card: string; white: string; nearWhite: string;
  gray: string; dim: string; label: string; green: string; greenDark: string;
  greenLight: string; red: string; redDark: string; border: string; divider: string;
  callBg: string; badgeGray: string; disabledBg: string; disabledText: string;
  pendingDot: string; tabBg: string; tabBorder: string;
  statusPending: string; statusPendingText: string; statusAccepted: string;
  statusAcceptedText: string; statusAtStore: string; statusAtStoreText: string;
  statusPickedUp: string; statusPickedUpText: string; statusOnWay: string;
  statusOnWayText: string; statusArrived: string; statusArrivedText: string;
  statusDelivered: string; statusDeliveredText: string; statusCancelled: string;
  statusCancelledText: string;
  radius: { sm: number; md: number; lg: number; xl: number; full: number };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number; xxxl: number };
  fontSize: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number; xxxl: number; hero: number };
  fontWeight: { normal: '400'; medium: '500'; semibold: '600'; bold: '700' };
}

function buildTheme(c: typeof colors): ThemeValues {
  return {
    bg: c.background,
    surface: c.surface,
    card: c.surface,
    white: c.text,
    nearWhite: c.text,
    gray: c.textSecondary,
    dim: c.textTertiary,
    label: c.textSecondary,
    green: c.primary,
    greenDark: c.primaryLight,
    greenLight: c.primary,
    red: c.danger,
    redDark: c.dangerLight,
    border: c.border,
    divider: c.border,
    callBg: c.primaryLight,
    badgeGray: c.borderLight,
    disabledBg: c.borderLight,
    disabledText: c.disabled,
    pendingDot: c.border,
    tabBg: c.background,
    tabBorder: c.border,
    statusPending: c.infoLight,
    statusPendingText: c.info,
    statusAccepted: c.primaryLight,
    statusAcceptedText: c.primary,
    statusAtStore: c.warningLight,
    statusAtStoreText: c.warning,
    statusPickedUp: c.infoLight,
    statusPickedUpText: c.info,
    statusOnWay: c.primaryLight,
    statusOnWayText: c.primary,
    statusArrived: c.warningLight,
    statusArrivedText: c.warning,
    statusDelivered: c.successLight,
    statusDeliveredText: c.success,
    statusCancelled: c.dangerLight,
    statusCancelledText: c.danger,
    radius: { sm: borderRadius.sm, md: borderRadius.md, lg: borderRadius.lg, xl: borderRadius.xl, full: borderRadius.full },
    spacing: { xs: spacing.xs, sm: spacing.sm, md: spacing.md, lg: spacing.lg, xl: spacing.xl, xxl: spacing.xxl, xxxl: spacing.xxxl },
    fontSize: { xs: fontSize.xs, sm: fontSize.sm, md: fontSize.md, lg: fontSize.lg, xl: fontSize.xl, xxl: fontSize.xxl, xxxl: fontSize.xxxl, hero: fontSize.hero },
    fontWeight: { normal: fontWeight.normal, medium: fontWeight.medium, semibold: fontWeight.semibold, bold: fontWeight.bold },
  };
}

export const darkTheme = buildTheme(darkColors);
export const lightTheme = buildTheme(colors);
export type Theme = ThemeValues;
export const theme = darkTheme;
