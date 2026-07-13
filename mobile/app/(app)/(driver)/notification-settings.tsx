import { View, Text, ScrollView, StyleSheet, Switch, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const switches = { push: true, email: true, sms: false, orderUpdates: true, promotional: false };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: t('notificationSettings.title'), headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={[S.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: theme.white }]}>{t('notificationSettings.pushNotifications')}</Text>
              <Text style={[S.hint, { color: theme.gray }]}>{t('notificationSettings.pushDesc')}</Text>
            </View>
            <Switch value={switches.push} trackColor={{ false: theme.border, true: theme.green }} thumbColor={theme.white} />
          </View>
          <View style={[S.divider, { backgroundColor: theme.border }]} />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: theme.white }]}>{t('notificationSettings.emailNotifications')}</Text>
              <Text style={[S.hint, { color: theme.gray }]}>{t('notificationSettings.emailDesc')}</Text>
            </View>
            <Switch value={switches.email} trackColor={{ false: theme.border, true: theme.green }} thumbColor={theme.white} />
          </View>
          <View style={[S.divider, { backgroundColor: theme.border }]} />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: theme.white }]}>{t('notificationSettings.smsNotifications')}</Text>
              <Text style={[S.hint, { color: theme.gray }]}>{t('notificationSettings.smsDesc')}</Text>
            </View>
            <Switch value={switches.sms} trackColor={{ false: theme.border, true: theme.green }} thumbColor={theme.white} />
          </View>
        </View>

        <Text style={[S.sectionTitle, { color: theme.white }]}>{t('notificationSettings.orderUpdates')}</Text>
        <View style={[S.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: theme.white }]}>{t('notificationSettings.orderUpdates')}</Text>
              <Text style={[S.hint, { color: theme.gray }]}>{t('notificationSettings.orderUpdatesDesc')}</Text>
            </View>
            <Switch value={switches.orderUpdates} trackColor={{ false: theme.border, true: theme.green }} thumbColor={theme.white} />
          </View>
          <View style={[S.divider, { backgroundColor: theme.border }]} />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Text style={[S.label, { color: theme.white }]}>{t('notificationSettings.promotional')}</Text>
              <Text style={[S.hint, { color: theme.gray }]}>{t('notificationSettings.promotionalDesc')}</Text>
            </View>
            <Switch value={switches.promotional} trackColor={{ false: theme.border, true: theme.green }} thumbColor={theme.white} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  hint: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  divider: { height: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
});
