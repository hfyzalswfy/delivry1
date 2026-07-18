import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing } from '../../../src/theme/spacing';
import { TabIcon } from '../../../src/components/ui/TabIcon';
import { BackButton } from '../../../src/components/BackButton';

export default function DriverLayout() {
  const { t } = useTranslation();
  const colors = useColors();

  const nonTabScreenOptions = (title: string) => ({
    href: null as any,
    title,
    headerLeft: () => <BackButton fallbackRoute="/(app)/(driver)" />,
  });

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' as const },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, height: 60, paddingBottom: spacing.sm, paddingTop: spacing.xs + 2 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' as const },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.home'),
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tab.orders'),
          tabBarIcon: ({ focused }) => <TabIcon icon="orders" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: t('tab.chat'),
          tabBarIcon: ({ focused }) => <TabIcon icon="chat" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tab.wallet'),
          tabBarIcon: ({ focused }) => <TabIcon icon="wallet" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile'),
          tabBarIcon: ({ focused }) => <TabIcon icon="profile" focused={focused} />,
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
