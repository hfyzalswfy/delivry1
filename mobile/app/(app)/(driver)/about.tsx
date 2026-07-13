import { View, Text, ScrollView, StyleSheet, SafeAreaView, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function AboutScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: t('about.title'), headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center' }}>
        <View style={[S.logo, { backgroundColor: theme.green }]}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: theme.white }}>FD</Text>
        </View>
        <Text style={[S.appName, { color: theme.white }]}>{t('about.appName')}</Text>
        <Text style={[S.version, { color: theme.gray }]}>{t('about.version')}</Text>
        <Text style={[S.description, { color: theme.gray }]}>{t('about.description')}</Text>

        <View style={[S.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={S.row}>
            <Text style={[S.label, { color: theme.gray }]}>{t('about.developer')}</Text>
            <Text style={[S.value, { color: theme.white }]}>FullDelivery Inc.</Text>
          </View>
          <View style={[S.divider, { backgroundColor: theme.border }]} />
          <View style={S.row}>
            <Text style={[S.label, { color: theme.gray }]}>{t('about.website')}</Text>
            <Text style={[S.value, { color: theme.green }]} onPress={() => Linking.openURL('https://fulldelivery.com')}>fulldelivery.com</Text>
          </View>
          <View style={[S.divider, { backgroundColor: theme.border }]} />
          <View style={S.row}>
            <Text style={[S.label, { color: theme.gray }]}>{t('about.email')}</Text>
            <Text style={[S.value, { color: theme.green }]} onPress={() => Linking.openURL('mailto:support@fulldelivery.com')}>support@fulldelivery.com</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  logo: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 16 },
  appName: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  version: { fontSize: 14, marginBottom: 16 },
  description: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 20 },
  card: { width: '100%', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1 },
});
