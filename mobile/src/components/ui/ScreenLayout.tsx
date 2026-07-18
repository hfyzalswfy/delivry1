import { View, ScrollView, StyleSheet, RefreshControl, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { useColors } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

interface ScreenLayoutProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
}

export function ScreenLayout({ children, scroll = true, padded = true, refreshing, onRefresh, style }: ScreenLayoutProps) {
  const colors = useColors();

  if (scroll) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }, style]}
        contentContainerStyle={padded ? styles.padded : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  padded: { padding: spacing.md },
});

interface SectionProps {
  title?: string;
  children: ReactNode;
  style?: ViewStyle;
}

const sectionStyles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  sectionBadge: { width: 3, height: 16, borderRadius: 2 },
});

export function Section({ title, children, style }: SectionProps) {
  const colors = useColors();
  return (
    <View style={[sectionStyles.section, style]}>
      {title && (
        <View style={sectionStyles.sectionHeader}>
          <View style={[sectionStyles.sectionBadge, { backgroundColor: colors.primary + '20' }]} />
          <View style={{ flex: 1 }} />
        </View>
      )}
      {children}
    </View>
  );
}
