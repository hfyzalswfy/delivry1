import { Tabs, router } from 'expo-router';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../src/theme/ThemeProvider';

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{icon}</Text>;
}

function BackButton({ color }: { color: string }) {
  return (
    <TouchableOpacity onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(app)/(driver)'); }} style={styles.backBtn}>
      <Text style={{ fontSize: 22, fontWeight: '600', color }}>{'\u2190'}</Text>
    </TouchableOpacity>
  );
}

const BACK_HEADER = (theme: ReturnType<typeof useTheme>) => ({
  headerLeft: () => <BackButton color={theme.white} />,
});

export default function DriverLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  const nonTabScreenOptions = (title: string) => ({
    href: null as any,
    title,
    ...BACK_HEADER(theme),
  });

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.white,
        headerTitleStyle: { fontWeight: '600' as const },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: theme.tabBg, borderTopColor: theme.tabBorder, borderTopWidth: 1, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: theme.green,
        tabBarInactiveTintColor: theme.gray,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' as const },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.home'),
          headerShown: false,
          tabBarIcon: () => <TabIcon icon="🏠" color={theme.gray} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tab.orders'),
          tabBarIcon: () => <TabIcon icon="🚚" color={theme.gray} />,
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: t('tab.chat'),
          tabBarIcon: () => <TabIcon icon="💬" color={theme.gray} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tab.wallet'),
          tabBarIcon: () => <TabIcon icon="👛" color={theme.gray} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile'),
          tabBarIcon: () => <TabIcon icon="👤" color={theme.gray} />,
        }}
      />
      <Tabs.Screen name="[orderId]" options={nonTabScreenOptions(t('orderDetail.title'))} />
      <Tabs.Screen name="confirm-acceptance" options={nonTabScreenOptions(t('orderDetail.title'))} />
      <Tabs.Screen name="pickup-confirmation" options={nonTabScreenOptions(t('orderDetail.confirmPickup'))} />
      <Tabs.Screen name="en-route" options={nonTabScreenOptions(t('enRoute.title'))} />
      <Tabs.Screen name="confirm-delivery" options={nonTabScreenOptions(t('confirmDelivery.title'))} />
      <Tabs.Screen name="report-issue" options={nonTabScreenOptions(t('reportIssue.title'))} />
      <Tabs.Screen name="delivery-summary" options={nonTabScreenOptions(t('deliverySummary.title'))} />
      <Tabs.Screen name="rewards" options={nonTabScreenOptions(t('rewards.title'))} />
      <Tabs.Screen name="account-status" options={nonTabScreenOptions(t('accountStatus.title'))} />
      <Tabs.Screen name="documents" options={nonTabScreenOptions(t('documents.title'))} />
      <Tabs.Screen name="settings" options={nonTabScreenOptions(t('settings.title'))} />
      <Tabs.Screen name="language" options={nonTabScreenOptions(t('language.title'))} />
      <Tabs.Screen name="appearance" options={nonTabScreenOptions(t('theme.title'))} />
      <Tabs.Screen name="privacy" options={nonTabScreenOptions(t('privacy.title'))} />
      <Tabs.Screen name="help" options={nonTabScreenOptions(t('help.title'))} />
      <Tabs.Screen name="about" options={nonTabScreenOptions(t('about.title'))} />
      <Tabs.Screen name="notification-settings" options={nonTabScreenOptions(t('notificationSettings.title'))} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  backBtn: { paddingLeft: 8, paddingRight: 16, paddingVertical: 4 },
});
