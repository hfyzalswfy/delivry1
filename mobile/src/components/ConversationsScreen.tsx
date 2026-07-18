import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useConversations } from '../hooks/use-conversations';
import { colors } from '../theme/colors';
import { spacing, fontSize, borderRadius } from '../theme/spacing';
import { ROLE_COLORS } from '../constants';

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export default function ConversationsScreen() {
  const { conversations, loading } = useConversations();

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: colors.background }} />;

  if (conversations.length === 0) {
    return (
      <View style={S.empty}>
        <Text style={S.emptyIcon}>{'\u{1F4AC}'}</Text>
        <Text style={S.emptyTitle}>No conversations yet</Text>
        <Text style={S.emptySub}>Start a delivery to begin chatting</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={conversations}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const party = item.other_party;
        const role = party?.role ?? 'customer';
        const roleColor = ROLE_COLORS[role] ?? ROLE_COLORS.customer;
        const firstChar = party?.full_name?.charAt(0).toUpperCase() ?? '?';

        return (
          <Link href={`/(app)/(chat)/${item.order_id}`} asChild>
            <TouchableOpacity style={S.item} activeOpacity={0.7}>
              <View style={[S.avatar, { backgroundColor: roleColor + '20' }]}>
                <Text style={[S.avatarText, { color: roleColor }]}>{firstChar}</Text>
              </View>
              <View style={S.content}>
                <View style={S.topRow}>
                  <Text style={S.name} numberOfLines={1}>{party?.full_name ?? `Order #${item.order_number}`}</Text>
                  {item.last_message && (
                    <Text style={S.time}>{formatRelativeTime(item.last_message.created_at)}</Text>
                  )}
                </View>
                <View style={S.bottomRow}>
                  <View style={S.orderBadge}>
                    <Text style={S.orderBadgeText}>#{item.order_number}</Text>
                  </View>
                  {item.last_message && (
                    <Text style={S.preview} numberOfLines={1}>
                      {truncate(item.last_message.content, 50)}
                    </Text>
                  )}
                  {!item.last_message && (
                    <Text style={S.previewEmpty}>No messages yet</Text>
                  )}
                </View>
              </View>
              <Text style={S.arrow}>{'\u{203A}'}</Text>
            </TouchableOpacity>
          </Link>
        );
      }}
    />
  );
}

const S = StyleSheet.create({
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderBadge: {
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    marginRight: spacing.sm,
  },
  orderBadgeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  preview: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    flex: 1,
  },
  previewEmpty: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  arrow: {
    fontSize: fontSize.xxl,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
});