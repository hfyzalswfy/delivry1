import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../src/theme/ThemeProvider';

function TabIcon({ icon, focused, color }: { icon: string; focused: boolean; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{icon}</Text>;
}

export default function DriverLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

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
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} color={focused ? theme.green : theme.gray} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tab.orders'),
          tabBarIcon: ({ focused }) => <TabIcon icon="🚚" focused={focused} color={focused ? theme.green : theme.gray} />,
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: t('tab.chat'),
          tabBarIcon: ({ focused }) => <TabIcon icon="💬" focused={focused} color={focused ? theme.green : theme.gray} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tab.wallet'),
          tabBarIcon: ({ focused }) => <TabIcon icon="👛" focused={focused} color={focused ? theme.green : theme.gray} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile'),
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} color={focused ? theme.green : theme.gray} />,
        }}
      />
      <Tabs.Screen name="[orderId]" options={{ href: null, title: t('orderDetail.title') }} />
      <Tabs.Screen name="confirm-acceptance" options={{ href: null, title: t('orderDetail.title') }} />
      <Tabs.Screen name="pickup-confirmation" options={{ href: null, title: t('orderDetail.confirmPickup') }} />
      <Tabs.Screen name="en-route" options={{ href: null, title: t('enRoute.title') }} />
      <Tabs.Screen name="confirm-delivery" options={{ href: null, title: t('confirmDelivery.title') }} />
      <Tabs.Screen name="report-issue" options={{ href: null, title: t('reportIssue.title') }} />
      <Tabs.Screen name="delivery-summary" options={{ href: null, title: t('deliverySummary.title') }} />
      <Tabs.Screen name="rewards" options={{ href: null, title: t('rewards.title') }} />
      <Tabs.Screen name="account-status" options={{ href: null, title: t('accountStatus.title') }} />
      <Tabs.Screen name="documents" options={{ href: null, title: t('documents.title') }} />
      <Tabs.Screen name="settings" options={{ href: null, title: t('settings.title') }} />
      <Tabs.Screen name="language" options={{ href: null, title: t('language.title') }} />
      <Tabs.Screen name="appearance" options={{ href: null, title: t('theme.title') }} />
      <Tabs.Screen name="privacy" options={{ href: null, title: t('privacy.title') }} />
      <Tabs.Screen name="help" options={{ href: null, title: t('help.title') }} />
      <Tabs.Screen name="about" options={{ href: null, title: t('about.title') }} />
      <Tabs.Screen name="notification-settings" options={{ href: null, title: t('notificationSettings.title') }} />
    </Tabs>
  );
}
