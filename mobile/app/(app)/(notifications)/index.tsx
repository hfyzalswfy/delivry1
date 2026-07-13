import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useNotificationsList } from '../../../src/hooks/use-notifications-list';
import { useAuthStore } from '../../../src/store/auth-store';
import { theme } from '../../../src/theme/driver-theme';

export default function NotificationsScreen() {
  const { notifications, unreadCount, loading, markAsRead } = useNotificationsList();
  const profile = useAuthStore((s) => s.profile);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: theme.bg }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        {unreadCount > 0 && (
          <View style={S.unreadBadge}>
            <Text style={S.unreadBadgeText}>{unreadCount} unread</Text>
          </View>
        )}

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={notifications.length === 0 ? S.emptyState : { paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={S.emptyContent}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>{'\u{1F514}'}</Text>
              <Text style={S.emptyTitle}>No notifications</Text>
              <Text style={S.emptySubtitle}>You'll see updates about your deliveries here</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[S.card, !item.read_at && S.cardUnread]}
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
              <View style={S.headerRow}>
                <Text style={[S.title, !item.read_at && S.titleUnread]} numberOfLines={1}>{item.title}</Text>
                {!item.read_at && <View style={S.dot} />}
              </View>
              <Text style={S.body} numberOfLines={2}>{item.body}</Text>
              <Text style={S.time}>
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

const S = StyleSheet.create({
  unreadBadge: {
    backgroundColor: theme.green,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 9999,
  },
  unreadBadgeText: {
    color: theme.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.white,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.gray,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  card: {
    backgroundColor: theme.card,
    marginHorizontal: 16,
    marginTop: 8,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardUnread: {
    borderColor: theme.greenDark,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.white,
    flex: 1,
  },
  titleUnread: {
    fontWeight: '700',
    color: theme.greenLight,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.green,
    marginLeft: 8,
  },
  body: {
    fontSize: theme.fontSize.sm,
    color: theme.gray,
    marginBottom: 8,
    lineHeight: 18,
  },
  time: {
    fontSize: theme.fontSize.xs,
    color: theme.dim,
  },
});
