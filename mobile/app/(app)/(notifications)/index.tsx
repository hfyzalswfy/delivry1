import { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useNotificationsList } from '../../../src/hooks/use-notifications-list';
import { useAuthStore } from '../../../src/store/auth-store';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { ICONS } from '../../../src/constants/icons';

export default function NotificationsScreen() {
  const { notifications, unreadCount, loading, markAsRead } = useNotificationsList();
  const profile = useAuthStore((s) => s.profile);
  const colors = useColors();
  const S = useStyles();

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {unreadCount > 0 && (
          <View style={S.unreadBadge}>
            <Text style={S.unreadBadgeText}>{unreadCount} unread</Text>
          </View>
        )}

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={notifications.length === 0 ? S.emptyState : { paddingBottom: spacing.md }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={S.emptyContent}>
              <MaterialIcons name={ICONS.notifications} size={fontSize.giant} color={colors.textTertiary} style={{ marginBottom: spacing.md }} />
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

function useStyles() {
  const colors = useColors();
  return useMemo(() => StyleSheet.create({
  unreadBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.full,
  },
  unreadBadgeText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardUnread: {
    borderColor: colors.primaryLight,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
  },
  titleUnread: {
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  dot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
}), [colors]);
}