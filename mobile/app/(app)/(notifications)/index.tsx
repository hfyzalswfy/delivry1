import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useNotificationsList } from '../../../src/hooks/use-notifications-list';
import { useAuthStore } from '../../../src/store/auth-store';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../../src/theme/spacing';

export default function NotificationsScreen() {
  const { notifications, unreadCount, loading, markAsRead } = useNotificationsList();
  const profile = useAuthStore((s) => s.profile);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.safe}>
    <View style={styles.container}>
      {unreadCount > 0 && (
        <Text style={styles.unreadBadge}>{unreadCount} unread</Text>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notifications.length === 0 ? styles.emptyState : undefined}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>You'll see updates about your deliveries here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifCard, !item.read_at && styles.notifUnread]}
            onPress={() => {
              if (!item.read_at) markAsRead(item.id);
              const orderId = item.data?.order_id as string | undefined;
              if (!orderId) return;
              if (item.notification_type === 'new_message') {
                router.push(`/(app)/(chat)/${orderId}`);
              } else {
                const role = profile?.role ?? 'customer';
                const base = role === 'store' ? 'store' : role === 'driver' ? 'driver' : 'customer';
                router.push(`/(app)/(${base})/${orderId}`);
              }
            }}
          >
            <View style={styles.notifHeader}>
              <Text style={[styles.notifTitle, !item.read_at && styles.notifTitleUnread]}>{item.title}</Text>
              {!item.read_at && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notifBody}>{item.body}</Text>
            <Text style={styles.notifTime}>
              {new Date(item.created_at).toLocaleDateString()} {' '}
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  unreadBadge: { backgroundColor: colors.primary, color: '#fff', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, alignSelf: 'flex-start', marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: borderRadius.full, fontSize: fontSize.sm, fontWeight: '600', overflow: 'hidden' },
  emptyState: { flex: 1, justifyContent: 'center' },
  emptyContent: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  notifCard: { backgroundColor: colors.surface, padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderLight },
  notifUnread: { backgroundColor: colors.primaryLight },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { fontSize: fontSize.md, fontWeight: '500', color: colors.text, flex: 1 },
  notifTitleUnread: { fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: spacing.sm },
  notifBody: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  notifTime: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs },
});
