export const ROLE_COLORS: Record<string, string> = {
  customer: '#8B5CF6',
  driver: '#22C55E',
  store: '#F59E0B',
  admin: '#EF4444',
};

export const ROLE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  customer: { label: 'Customer', emoji: '\u{1F464}', color: '#8B5CF6' },
  driver: { label: 'Driver', emoji: '\u{1F69A}', color: '#22C55E' },
  store: { label: 'Store', emoji: '\u{1F6D2}', color: '#F59E0B' },
  admin: { label: 'Admin', emoji: '\u{2699}\u{FE0F}', color: '#EF4444' },
};
