import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/index';

const FAQS = [
  { qKey: 'help.faq1q', aKey: 'help.faq1a' },
  { qKey: 'help.faq2q', aKey: 'help.faq2a' },
  { qKey: 'help.faq3q', aKey: 'help.faq3a' },
  { qKey: 'help.faq4q', aKey: 'help.faq4a' },
];

export default function HelpScreen() {
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('help.title'), headerTitleStyle: { fontWeight: '600', color: colors.text } }} />
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Text style={[S.desc, { color: colors.textSecondary }]}>{t('help.desc')}</Text>

        <Text style={[S.sectionTitle, { color: colors.text }]}>{t('help.faq')}</Text>
        {FAQS.map((faq, idx) => (
          <View key={idx} style={[S.faqCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[S.question, { color: colors.text }]}>{t(faq.qKey)}</Text>
            <Text style={[S.answer, { color: colors.textSecondary }]}>{t(faq.aKey)}</Text>
          </View>
        ))}

        <View style={{ marginTop: spacing.lg }}>
          <Text style={[S.sectionTitle, { color: colors.text }]}>{t('help.contactSupport')}</Text>
          <Text style={[S.desc, { color: colors.textSecondary }]}>{t('help.contactDesc')}</Text>
          <TouchableOpacity style={[S.contactBtn, { backgroundColor: colors.primary }]} onPress={() => Linking.openURL('mailto:support@fulldelivery.com')}>
            <Text style={[S.contactBtnText, { color: colors.text }]}>{t('help.contactSupport')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  desc: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md },
  faqCard: { borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  question: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.xs },
  answer: { fontSize: fontSize.sm, lineHeight: 18 },
  contactBtn: { paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.md },
  contactBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
