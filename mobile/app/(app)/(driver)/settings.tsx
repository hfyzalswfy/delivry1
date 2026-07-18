import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../src/store/auth-store';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { Card, CardDivider } from '../../../src/components/ui/Card';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../../src/constants/icons';

interface SettingsItem {
  icon: string;
  labelKey: string;
  route?: string;
  onPress?: () => void;
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const signOut = useAuthStore((s) => s.signOut);

  const SECTIONS: SettingsItem[][] = [
    [
      { icon: ICONS.person, labelKey: 'settingsItems.accountSettings', route: '/(app)/(driver)/profile' },
      { icon: ICONS.notifications, labelKey: 'settingsItems.notificationsSettings', route: '/(app)/(driver)/notification-settings' },
      { icon: ICONS.shield, labelKey: 'settingsItems.privacySettings', route: '/(app)/(driver)/privacy' },
    ],
    [
      { icon: ICONS.language, labelKey: 'settings.language', route: '/(app)/(driver)/language' },
      { icon: ICONS.palette, labelKey: 'settings.theme', route: '/(app)/(driver)/appearance' },
    ],
    [
      { icon: ICONS.helpOutline, labelKey: 'settingsItems.helpSupport', route: '/(app)/(driver)/help' },
      { icon: ICONS.infoOutline, labelKey: 'settings.about', route: '/(app)/(driver)/about' },
    ],
  ];

  const handleSignOut = () => {
    Alert.alert(t('auth.signOutConfirmTitle'), t('auth.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  const renderItem = (item: SettingsItem, isLast: boolean) => (
    <TouchableOpacity
      key={item.labelKey}
      style={styles.item}
      onPress={() => {
        if (item.onPress) item.onPress();
        else if (item.route) router.push(item.route as any);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.itemLeft}>
        <MaterialIcons name={item.icon as any} size={fontSize.xl} color={colors.text} />
        <Text style={[styles.itemLabel, { color: colors.text }]}>{t(item.labelKey)}</Text>
      </View>
      <MaterialIcons name={ICONS.chevronRight} size={fontSize.xxl} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: t('settings.title'), headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {SECTIONS.map((group, gi) => (
          <Card key={gi} style={styles.group}>
            {group.map((item, idx) => (
              <View key={item.labelKey}>
                {renderItem(item, idx === group.length - 1)}
                {idx < group.length - 1 && <CardDivider />}
              </View>
            ))}
          </Card>
        ))}

        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.danger + '40' }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={[styles.signOutText, { color: colors.danger }]}>{t('auth.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl, paddingTop: spacing.sm },
  group: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemLabel: { fontSize: fontSize.md, fontWeight: fontWeight.medium, marginLeft: spacing.sm },
  signOutBtn: { marginHorizontal: spacing.md, marginTop: spacing.sm, paddingVertical: spacing.md, alignItems: 'center', borderRadius: borderRadius.lg, borderWidth: 1 },
  signOutText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
