interface ThemeValues {
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

export const darkTheme: ThemeValues = {
  bg: '#121212', surface: '#1A1A1A', card: '#1E1E1E', white: '#FFFFFF', nearWhite: '#F3F4F6',
  gray: '#9CA3AF', dim: '#6B6B6B', label: '#6B7280', green: '#22C55E', greenDark: '#064E3B',
  greenLight: '#4ADE80', red: '#EF4444', redDark: '#7F1D1D', border: '#2A2A2A', divider: '#2A2A2A',
  callBg: '#064E3B', badgeGray: '#2A2A2A', disabledBg: '#2A2A2A', disabledText: '#6B7280',
  pendingDot: '#3A3A3A', tabBg: '#0D0D0D', tabBorder: '#2A2A2A',
  statusPending: '#1E3A5F', statusPendingText: '#60A5FA', statusAccepted: '#064E3B',
  statusAcceptedText: '#4ADE80', statusAtStore: '#713F12', statusAtStoreText: '#FBBF24',
  statusPickedUp: '#1E3A5F', statusPickedUpText: '#60A5FA', statusOnWay: '#064E3B',
  statusOnWayText: '#4ADE80', statusArrived: '#713F12', statusArrivedText: '#FBBF24',
  statusDelivered: '#065F46', statusDeliveredText: '#6EE7B7', statusCancelled: '#7F1D1D',
  statusCancelledText: '#FCA5A5',
  radius: { sm: 6, md: 10, lg: 12, xl: 16, full: 9999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  fontSize: { xs: 11, sm: 12, md: 14, lg: 16, xl: 18, xxl: 22, xxxl: 24, hero: 48 },
  fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
};

export const lightTheme: ThemeValues = {
  bg: '#F8FAFC', surface: '#FFFFFF', card: '#FFFFFF', white: '#0F172A', nearWhite: '#1E293B',
  gray: '#64748B', dim: '#94A3B8', label: '#6B7280', green: '#16A34A', greenDark: '#166534',
  greenLight: '#22C55E', red: '#DC2626', redDark: '#FEE2E2', border: '#E2E8F0', divider: '#E2E8F0',
  callBg: '#DCFCE7', badgeGray: '#F1F5F9', disabledBg: '#F1F5F9', disabledText: '#94A3B8',
  pendingDot: '#CBD5E1', tabBg: '#FFFFFF', tabBorder: '#E2E8F0',
  statusPending: '#EFF6FF', statusPendingText: '#2563EB', statusAccepted: '#F0FDF4',
  statusAcceptedText: '#16A34A', statusAtStore: '#FFFBEB', statusAtStoreText: '#D97706',
  statusPickedUp: '#EFF6FF', statusPickedUpText: '#2563EB', statusOnWay: '#F0FDF4',
  statusOnWayText: '#16A34A', statusArrived: '#FFFBEB', statusArrivedText: '#D97706',
  statusDelivered: '#F0FDF4', statusDeliveredText: '#15803D', statusCancelled: '#FEF2F2',
  statusCancelledText: '#DC2626',
  radius: { sm: 6, md: 10, lg: 12, xl: 16, full: 9999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  fontSize: { xs: 11, sm: 12, md: 14, lg: 16, xl: 18, xxl: 22, xxxl: 24, hero: 48 },
  fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
};

export type Theme = ThemeValues;
export const theme = darkTheme;
