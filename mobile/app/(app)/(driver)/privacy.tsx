import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [dataSharing, setDataSharing] = useState(false);
  const [locationTracking, setLocationTracking] = useState(true);
  const [analytics, setAnalytics] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: t('privacy.title'), headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={[S.desc, { color: theme.gray }]}>{t('privacy.desc')}</Text>

        <View style={[S.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: theme.white }]}>{t('privacy.dataSharing')}</Text>
              <Text style={[S.hint, { color: theme.gray }]}>{t('privacy.dataSharingDesc')}</Text>
            </View>
            <Switch value={dataSharing} onValueChange={setDataSharing} trackColor={{ false: theme.border, true: theme.green }} thumbColor={theme.white} />
          </View>
          <View style={[S.divider, { backgroundColor: theme.border }]} />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: theme.white }]}>{t('privacy.locationTracking')}</Text>
              <Text style={[S.hint, { color: theme.gray }]}>{t('privacy.locationTrackingDesc')}</Text>
            </View>
            <Switch value={locationTracking} onValueChange={setLocationTracking} trackColor={{ false: theme.border, true: theme.green }} thumbColor={theme.white} />
          </View>
          <View style={[S.divider, { backgroundColor: theme.border }]} />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: theme.white }]}>{t('privacy.analytics')}</Text>
              <Text style={[S.hint, { color: theme.gray }]}>{t('privacy.analyticsDesc')}</Text>
            </View>
            <Switch value={analytics} onValueChange={setAnalytics} trackColor={{ false: theme.border, true: theme.green }} thumbColor={theme.white} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  desc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  hint: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  divider: { height: 1 },
});
