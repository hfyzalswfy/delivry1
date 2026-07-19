import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth-store';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { Card, CardDivider } from '../../../src/components/ui/Card';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../../src/constants/icons';

interface SettingsItem {
  icon: string;
  label: string;
  route?: string;
  onPress?: () => void;
}

export default function StoreSettingsScreen() {
  const colors = useColors();
  const signOut = useAuthStore((s) => s.signOut);

  const SECTIONS: SettingsItem[][] = [
    [
      { icon: ICONS.store, label: 'Store Profile', route: '/(app)/(store)/profile' },
      { icon: ICONS.storeAlt, label: 'Store Address', route: '/(app)/(store)/store-address' },
      { icon: ICONS.notifications, label: 'Notification Settings' },
    ],
    [
      { icon: ICONS.language, label: 'Language' },
      { icon: ICONS.palette, label: 'Appearance' },
    ],
    [
      { icon: ICONS.helpOutline, label: 'Help & Support' },
      { icon: ICONS.infoOutline, label: 'About' },
    ],
  ];

  const handleSignOut = () => {
    Alert.alert('Confirm Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const renderItem = (item: SettingsItem, isLast: boolean) => (
    <TouchableOpacity
      key={item.label}
      style={styles.item}
      onPress={() => {
        if (item.onPress) item.onPress();
        else if (item.route) router.push(item.route as any);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.itemLeft}>
        <MaterialIcons name={item.icon as any} size={fontSize.xl} color={colors.text} />
        <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
      </View>
      <MaterialIcons name={ICONS.chevronRight} size={fontSize.xxl} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Settings', headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {SECTIONS.map((group, gi) => (
          <Card key={gi} style={styles.group}>
            {group.map((item, idx) => (
              <View key={item.label}>
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
          <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
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
