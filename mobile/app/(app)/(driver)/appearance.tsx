import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../../src/store/settings-store';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/index';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../../src/constants/icons';

const OPTIONS: { key: 'dark' | 'light' | 'system'; labelKey: string; icon: keyof typeof ICONS }[] = [
  { key: 'dark', labelKey: 'theme.dark', icon: 'darkMode' },
  { key: 'light', labelKey: 'theme.light', icon: 'lightMode' },
  { key: 'system', labelKey: 'theme.system', icon: 'phone' },
];

export default function AppearanceScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { theme: currentTheme, setTheme } = useSettingsStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('theme.title'), headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />
      <View style={{ padding: spacing.md }}>
        <Text style={[S.desc, { color: colors.textSecondary }]}>{t('theme.desc')}</Text>

        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[S.card, { backgroundColor: colors.surface, borderColor: currentTheme === opt.key ? colors.primaryLight : colors.border, borderRadius: borderRadius.lg }]}
            onPress={() => setTheme(opt.key)}
          >
            <MaterialIcons name={ICONS[opt.icon]} size={fontSize.xxl} color={colors.text} />
            <Text style={[S.label, { color: colors.text }, currentTheme === opt.key && { color: colors.primary }]}>{t(opt.labelKey)}</Text>
            {currentTheme === opt.key && (
              <MaterialIcons name={ICONS.check} size={fontSize.xl} color={colors.primary} style={{ marginLeft: 'auto' }} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  desc: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 20 / 14, marginBottom: spacing.xl - spacing.xs },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm + spacing.xs, borderWidth: 1 },
  label: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginLeft: spacing.sm + spacing.xs + 2 },
});
