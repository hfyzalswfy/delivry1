import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/index';

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const [switches, setSwitches] = useState<Record<string, boolean>>({ push: true, email: true, sms: false, orderUpdates: true, promotional: false });
  const toggle = (key: string) => setSwitches((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('notificationSettings.title'), headerTitleStyle: { fontWeight: '600', color: colors.text } }} />
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <View style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: colors.text }]}>{t('notificationSettings.pushNotifications')}</Text>
              <Text style={[S.hint, { color: colors.textSecondary }]}>{t('notificationSettings.pushDesc')}</Text>
            </View>
            <Switch value={switches.push} onValueChange={() => toggle('push')} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} />
          </View>
          <View style={[S.divider, { backgroundColor: colors.border }]} />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: colors.text }]}>{t('notificationSettings.emailNotifications')}</Text>
              <Text style={[S.hint, { color: colors.textSecondary }]}>{t('notificationSettings.emailDesc')}</Text>
            </View>
            <Switch value={switches.email} onValueChange={() => toggle('email')} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} />
          </View>
          <View style={[S.divider, { backgroundColor: colors.border }]} />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: colors.text }]}>{t('notificationSettings.smsNotifications')}</Text>
              <Text style={[S.hint, { color: colors.textSecondary }]}>{t('notificationSettings.smsDesc')}</Text>
            </View>
            <Switch value={switches.sms} onValueChange={() => toggle('sms')} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} />
          </View>
        </View>

        <Text style={[S.sectionTitle, { color: colors.text }]}>{t('notificationSettings.orderUpdates')}</Text>
        <View style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: colors.text }]}>{t('notificationSettings.orderUpdates')}</Text>
              <Text style={[S.hint, { color: colors.textSecondary }]}>{t('notificationSettings.orderUpdatesDesc')}</Text>
            </View>
            <Switch value={switches.orderUpdates} onValueChange={() => toggle('orderUpdates')} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} />
          </View>
          <View style={[S.divider, { backgroundColor: colors.border }]} />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: colors.text }]}>{t('notificationSettings.promotional')}</Text>
              <Text style={[S.hint, { color: colors.textSecondary }]}>{t('notificationSettings.promotionalDesc')}</Text>
            </View>
            <Switch value={switches.promotional} onValueChange={() => toggle('promotional')} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.xs },
  hint: { fontSize: fontSize.xs, lineHeight: 16, marginTop: spacing.xs },
  divider: { height: 1 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md },
});
