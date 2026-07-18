import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight, lineHeight } from '../../../src/theme/index';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../../src/constants/icons';

const LANGUAGES = [
  { key: 'en' as const, label: 'English', native: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { key: 'ar' as const, label: 'Arabic', native: '\u{0627}\u{0644}\u{0639}\u{0631}\u{0628}\u{064A}\u{0629}', flag: '\u{1F1F8}\u{1F1E6}' },
];

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const S = useMemo(() => createStyles(colors, spacing, fontSize, borderRadius, fontWeight, lineHeight), [colors]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('language.title'), headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />
      <View style={{ padding: spacing.md }}>
        <Text style={S.desc}>{t('language.desc')}</Text>

        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.key}
            style={[S.langCard, i18n.language === lang.key && S.langCardActive]}
            onPress={() => { if (i18n.language !== lang.key) i18n.changeLanguage(lang.key); }}
          >
            <Text style={{ fontSize: fontSize.xxxl }}>{lang.flag}</Text>
            <View style={{ flex: 1, marginLeft: spacing.sm + spacing.xs + 2 }}>
              <Text style={[S.langLabel, i18n.language === lang.key && S.langLabelActive]}>{lang.label}</Text>
              <Text style={S.langNative}>{lang.native}</Text>
            </View>
            {i18n.language === lang.key && (
              <MaterialIcons name={ICONS.check} size={fontSize.xl} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        <Text style={S.note}>{t('language.note')}</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>, spacing: any, fontSize: any, borderRadius: any, fontWeight: any, lineHeight: any) => StyleSheet.create({
  desc: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: fontSize.md * lineHeight.tight, marginBottom: spacing.xl - spacing.xs },
  langCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.sm + spacing.xs, borderWidth: 1, borderColor: colors.border },
  langCardActive: { borderColor: colors.primaryLight },
  langLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs },
  langLabelActive: { color: colors.primary },
  langNative: { fontSize: fontSize.md, color: colors.textSecondary },
  note: { fontSize: fontSize.sm, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.md, lineHeight: fontSize.sm * lineHeight.tight },
});
