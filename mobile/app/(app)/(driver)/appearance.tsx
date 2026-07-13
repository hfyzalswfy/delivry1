import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../../src/store/settings-store';
import { useTheme } from '../../../src/theme/ThemeProvider';

const OPTIONS: { key: 'dark' | 'light' | 'system'; labelKey: string; icon: string }[] = [
  { key: 'dark', labelKey: 'theme.dark', icon: '\u{1F31B}' },
  { key: 'light', labelKey: 'theme.light', icon: '\u{2600}\u{FE0F}' },
  { key: 'system', labelKey: 'theme.system', icon: '\u{1F4F1}' },
];

export default function AppearanceScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { theme: currentTheme, setTheme } = useSettingsStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: t('theme.title'), headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
      <View style={{ padding: 16 }}>
        <Text style={[S.desc, { color: theme.gray }]}>{t('theme.desc')}</Text>

        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[S.card, { backgroundColor: theme.card, borderColor: currentTheme === opt.key ? theme.greenDark : theme.border }]}
            onPress={() => setTheme(opt.key)}
          >
            <Text style={{ fontSize: 24 }}>{opt.icon}</Text>
            <Text style={[S.label, { color: theme.white }, currentTheme === opt.key && { color: theme.greenLight }]}>{t(opt.labelKey)}</Text>
            {currentTheme === opt.key && (
              <Text style={{ fontSize: 20, color: theme.green, marginLeft: 'auto' }}>{'\u{2713}'}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  desc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  label: { fontSize: 16, fontWeight: '600', marginLeft: 14 },
});
