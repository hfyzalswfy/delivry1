import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme } from '../../../src/theme/driver-theme';

const LANGUAGES = [
  { key: 'en' as const, label: 'English', native: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { key: 'ar' as const, label: 'Arabic', native: '\u{0627}\u{0644}\u{0639}\u{0631}\u{0628}\u{064A}\u{0629}', flag: '\u{1F1F8}\u{1F1E6}' },
];

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: t('language.title'), headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
      <View style={{ padding: 16 }}>
        <Text style={S.desc}>{t('language.desc')}</Text>

        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.key}
            style={[S.langCard, i18n.language === lang.key && S.langCardActive]}
            onPress={() => { if (i18n.language !== lang.key) i18n.changeLanguage(lang.key); }}
          >
            <Text style={{ fontSize: 28 }}>{lang.flag}</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[S.langLabel, i18n.language === lang.key && S.langLabelActive]}>{lang.label}</Text>
              <Text style={S.langNative}>{lang.native}</Text>
            </View>
            {i18n.language === lang.key && (
              <Text style={{ fontSize: 20, color: theme.green }}>{'\u{2713}'}</Text>
            )}
          </TouchableOpacity>
        ))}

        <Text style={S.note}>{t('language.note')}</Text>
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  desc: { fontSize: theme.fontSize.md, color: theme.gray, lineHeight: 20, marginBottom: 20 },
  langCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  langCardActive: { borderColor: theme.greenDark },
  langLabel: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold, color: theme.white, marginBottom: 2 },
  langLabelActive: { color: theme.greenLight },
  langNative: { fontSize: theme.fontSize.md, color: theme.gray },
  note: { fontSize: theme.fontSize.sm, color: theme.dim, textAlign: 'center', marginTop: 16, lineHeight: 18 },
});
