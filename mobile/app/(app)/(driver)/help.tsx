import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../src/theme/ThemeProvider';

const FAQS = [
  { qKey: 'help.faq1q', aKey: 'help.faq1a' },
  { qKey: 'help.faq2q', aKey: 'help.faq2a' },
  { qKey: 'help.faq3q', aKey: 'help.faq3a' },
  { qKey: 'help.faq4q', aKey: 'help.faq4a' },
];

export default function HelpScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: t('help.title'), headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={[S.desc, { color: theme.gray }]}>{t('help.desc')}</Text>

        <Text style={[S.sectionTitle, { color: theme.white }]}>{t('help.faq')}</Text>
        {FAQS.map((faq, idx) => (
          <View key={idx} style={[S.faqCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[S.question, { color: theme.white }]}>{t(faq.qKey)}</Text>
            <Text style={[S.answer, { color: theme.gray }]}>{t(faq.aKey)}</Text>
          </View>
        ))}

        <View style={{ marginTop: 24 }}>
          <Text style={[S.sectionTitle, { color: theme.white }]}>{t('help.contactSupport')}</Text>
          <Text style={[S.desc, { color: theme.gray }]}>{t('help.contactDesc')}</Text>
          <TouchableOpacity style={[S.contactBtn, { backgroundColor: theme.green }]} onPress={() => Linking.openURL('mailto:support@fulldelivery.com')}>
            <Text style={[S.contactBtnText, { color: theme.white }]}>{t('help.contactSupport')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  desc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  faqCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  question: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  answer: { fontSize: 13, lineHeight: 18 },
  contactBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  contactBtnText: { fontSize: 14, fontWeight: '600' },
});
