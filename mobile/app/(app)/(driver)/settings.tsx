import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../src/store/auth-store';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const signOut = useAuthStore((s) => s.signOut);

  const SECTIONS: { icon: string; labelKey: string; route?: string; onPress?: () => void }[][] = [
    [
      { icon: '\u{1F464}', labelKey: 'settingsItems.accountSettings', route: '/(app)/(driver)/profile' },
      { icon: '\u{1F514}', labelKey: 'settingsItems.notificationsSettings', route: '/(app)/(driver)/notification-settings' },
      { icon: '\u{1F6E1}\u{FE0F}', labelKey: 'settingsItems.privacySettings', route: '/(app)/(driver)/privacy' },
    ],
    [
      { icon: '\u{1F198}', labelKey: 'settings.language', route: '/(app)/(driver)/language' },
      { icon: '\u{1F3A8}', labelKey: 'settings.theme', route: '/(app)/(driver)/appearance' },
    ],
    [
      { icon: '\u{2753}', labelKey: 'settingsItems.helpSupport', route: '/(app)/(driver)/help' },
      { icon: '\u{2139}\u{FE0F}', labelKey: 'settings.about', route: '/(app)/(driver)/about' },
    ],
  ];

  const handleSignOut = () => {
    Alert.alert(t('auth.signOutConfirmTitle'), t('auth.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: t('settings.title'), headerTitleStyle: { fontWeight: '600', color: theme.white } }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={[S.appName, { color: theme.dim }]}>{t('settings.version')}</Text>

        {SECTIONS.map((group, gi) => (
          <View key={gi} style={[S.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {group.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[S.item, { borderBottomColor: theme.border }, idx === group.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  if (item.onPress) item.onPress();
                  else if (item.route) router.push(item.route as any);
                }}
              >
                <View style={S.itemLeft}>
                  <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                  <Text style={[S.itemLabel, { color: theme.white }]}>{t(item.labelKey)}</Text>
                </View>
                <Text style={[S.itemArrow, { color: theme.gray }]}>{'\u{203A}'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity style={[S.signOutBtn, { backgroundColor: theme.card, borderColor: theme.redDark }]} onPress={handleSignOut}>
          <Text style={[S.signOutText, { color: theme.red }]}>{t('auth.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  appName: { fontSize: 12, textAlign: 'center', marginTop: 16, marginBottom: 20 },
  group: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  itemLabel: { fontSize: 14, fontWeight: '500', marginLeft: 12 },
  itemArrow: { fontSize: 22 },
  signOutBtn: { marginHorizontal: 16, marginTop: 8, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  signOutText: { fontSize: 14, fontWeight: '600' },
});
