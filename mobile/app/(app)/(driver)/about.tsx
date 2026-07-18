import { View, Text, ScrollView, StyleSheet, SafeAreaView, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/index';

export default function AboutScreen() {
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('about.title'), headerTitleStyle: { fontWeight: '600', color: colors.text } }} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, alignItems: 'center' }}>
        <View style={[S.logo, { backgroundColor: colors.primary }]}>
          <Text style={{ fontSize: fontSize.hero, fontWeight: fontWeight.bold, color: colors.text }}>FD</Text>
        </View>
        <Text style={[S.appName, { color: colors.text }]}>{t('about.appName')}</Text>
        <Text style={[S.version, { color: colors.textSecondary }]}>{t('about.version')}</Text>
        <Text style={[S.description, { color: colors.textSecondary }]}>{t('about.description')}</Text>

        <View style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={S.row}>
            <Text style={[S.label, { color: colors.textSecondary }]}>{t('about.developer')}</Text>
            <Text style={[S.value, { color: colors.text }]}>FullDelivery Inc.</Text>
          </View>
          <View style={[S.divider, { backgroundColor: colors.border }]} />
          <View style={S.row}>
            <Text style={[S.label, { color: colors.textSecondary }]}>{t('about.website')}</Text>
            <Text style={[S.value, { color: colors.primary }]} onPress={() => Linking.openURL('https://fulldelivery.com')}>fulldelivery.com</Text>
          </View>
          <View style={[S.divider, { backgroundColor: colors.border }]} />
          <View style={S.row}>
            <Text style={[S.label, { color: colors.textSecondary }]}>{t('about.email')}</Text>
            <Text style={[S.value, { color: colors.primary }]} onPress={() => Linking.openURL('mailto:support@fulldelivery.com')}>support@fulldelivery.com</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  logo: { width: 80, height: 80, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  appName: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  version: { fontSize: fontSize.sm, marginBottom: spacing.md },
  description: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg, paddingHorizontal: spacing.lg },
  card: { width: '100%', borderRadius: borderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  label: { fontSize: fontSize.sm },
  value: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  divider: { height: 1 },
});
