import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/index';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const [dataSharing, setDataSharing] = useState(false);
  const [locationTracking, setLocationTracking] = useState(true);
  const [analytics, setAnalytics] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('privacy.title'), headerTitleStyle: { fontWeight: '600', color: colors.text } }} />
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Text style={[S.desc, { color: colors.textSecondary }]}>{t('privacy.desc')}</Text>

        <View style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: colors.text }]}>{t('privacy.dataSharing')}</Text>
              <Text style={[S.hint, { color: colors.textSecondary }]}>{t('privacy.dataSharingDesc')}</Text>
            </View>
            <Switch value={dataSharing} onValueChange={setDataSharing} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} />
          </View>
          <View style={[S.divider, { backgroundColor: colors.border }]} />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: colors.text }]}>{t('privacy.locationTracking')}</Text>
              <Text style={[S.hint, { color: colors.textSecondary }]}>{t('privacy.locationTrackingDesc')}</Text>
            </View>
            <Switch value={locationTracking} onValueChange={setLocationTracking} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} />
          </View>
          <View style={[S.divider, { backgroundColor: colors.border }]} />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: colors.text }]}>{t('privacy.analytics')}</Text>
              <Text style={[S.hint, { color: colors.textSecondary }]}>{t('privacy.analyticsDesc')}</Text>
            </View>
            <Switch value={analytics} onValueChange={setAnalytics} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  desc: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.lg },
  card: { borderRadius: borderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.xs },
  hint: { fontSize: fontSize.xs, lineHeight: 16, marginTop: spacing.xs },
  divider: { height: 1 },
});
