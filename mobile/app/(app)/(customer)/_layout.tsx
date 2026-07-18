import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useColors } from '../../../src/theme/ThemeProvider';
import { NotificationsButton } from '../../../src/components/NotificationsButton';
import { SignOutButton } from '../../../src/components/SignOutButton';
import { TabIcon } from '../../../src/components/ui/TabIcon';

export default function CustomerLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <NotificationsButton />
            <SignOutButton />
          </View>
        ),
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused }) => <TabIcon icon="orders" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => <TabIcon icon="chat" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon icon="profile" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="[orderId]"
        options={{
          href: null,
          title: 'Delivery Details',
        }}
      />
    </Tabs>
  );
}
